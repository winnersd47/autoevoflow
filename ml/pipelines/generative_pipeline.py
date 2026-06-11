"""
Generative Evolution Pipeline.

Generates hypothetical car designs using Stable Diffusion + ControlNet:
  - Predict next generation designs from brand trends
  - Reimagine classic cars in modern eras (retro-modern)
  - Interpolate smooth visual sequences between two generations
  - Synthesise missing intermediate generations
  - Transfer brand DNA from one marque to another
"""

from __future__ import annotations

import io
import os
import random
from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np
import structlog
import torch
from PIL import Image, ImageFilter

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class GeneratedImage:
    """Output of any generative pipeline method."""

    image: Image.Image
    prompt_used: str
    seed: int
    generation_steps: int
    guidance_scale: float
    model_used: str
    metadata: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


class GenerativeEvolutionPipeline:
    """
    Generative pipeline for hypothetical automotive design evolution.

    Uses Stable Diffusion 1.5 with a ControlNet (Canny) conditioning model
    to produce structurally guided car renderings.  Models are loaded lazily
    on first use to minimise startup time.

    Args:
        device: Torch device string ("cuda", "cpu", or "mps").
        sd_model_id: HuggingFace hub ID or local path for the base SD model.
        controlnet_model_id: Hub ID or local path for the ControlNet model.
        num_inference_steps: Default number of diffusion steps.
        guidance_scale: Default classifier-free guidance scale.
    """

    _DEFAULT_SD_MODEL = "runwayml/stable-diffusion-v1-5"
    _DEFAULT_CONTROLNET = "lllyasviel/sd-controlnet-canny"

    def __init__(
        self,
        device: str = "cuda",
        sd_model_id: str = _DEFAULT_SD_MODEL,
        controlnet_model_id: str = _DEFAULT_CONTROLNET,
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
    ) -> None:
        self.device = device if torch.cuda.is_available() or device != "cuda" else "cpu"
        self.sd_model_id = sd_model_id
        self.controlnet_model_id = controlnet_model_id
        self.num_inference_steps = num_inference_steps
        self.guidance_scale = guidance_scale
        self.logger = structlog.get_logger(__name__)

        # Loaded lazily
        self.pipe = None
        self.controlnet = None
        self._img2img_pipe = None

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _load_models(self) -> None:
        """
        Lazy-load Stable Diffusion + ControlNet on first use.

        Uses half-precision on CUDA to reduce VRAM requirements.
        Enables xformers memory-efficient attention when available.
        """
        if self.pipe is not None:
            return

        from diffusers import (
            ControlNetModel,
            StableDiffusionControlNetPipeline,
            StableDiffusionImg2ImgPipeline,
            UniPCMultistepScheduler,
        )

        self.logger.info("loading_controlnet", model_id=self.controlnet_model_id)
        dtype = torch.float16 if self.device == "cuda" else torch.float32

        self.controlnet = ControlNetModel.from_pretrained(
            self.controlnet_model_id,
            torch_dtype=dtype,
        )

        self.logger.info("loading_stable_diffusion", model_id=self.sd_model_id)
        self.pipe = StableDiffusionControlNetPipeline.from_pretrained(
            self.sd_model_id,
            controlnet=self.controlnet,
            torch_dtype=dtype,
            safety_checker=None,
        ).to(self.device)

        # Fast scheduler
        self.pipe.scheduler = UniPCMultistepScheduler.from_config(
            self.pipe.scheduler.config
        )

        # Img2Img pipeline for interpolation / retro-modern
        self._img2img_pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            self.sd_model_id,
            torch_dtype=dtype,
            safety_checker=None,
        ).to(self.device)
        self._img2img_pipe.scheduler = UniPCMultistepScheduler.from_config(
            self._img2img_pipe.scheduler.config
        )

        # Memory optimisation
        try:
            self.pipe.enable_xformers_memory_efficient_attention()
            self._img2img_pipe.enable_xformers_memory_efficient_attention()
            self.logger.info("xformers_enabled")
        except Exception:
            self.logger.debug("xformers_not_available")

        self.logger.info("generative_models_loaded", device=self.device)

    # ------------------------------------------------------------------
    # Image preprocessing
    # ------------------------------------------------------------------

    def _extract_car_silhouette(self, image: Image.Image) -> Image.Image:
        """
        Extract car silhouette / edge map for ControlNet conditioning.

        Applies a multi-step Canny-like edge extraction:
          1. Convert to grayscale.
          2. Gaussian blur for noise reduction.
          3. Edge detection using PIL ImageFilter.FIND_EDGES.
          4. Threshold and invert for white-edges-on-black.
          5. Morphological dilation to strengthen thin edges.

        Returns:
            RGB PIL Image suitable for ControlNet canny conditioning.
        """
        # Resize to 512x512 for SD 1.5
        img_resized = image.convert("RGB").resize((512, 512), Image.LANCZOS)
        gray = img_resized.convert("L")

        # Gaussian blur to suppress noise
        gray_blurred = gray.filter(ImageFilter.GaussianBlur(radius=1.5))

        # Edge detection
        edges = gray_blurred.filter(ImageFilter.FIND_EDGES)

        # Enhance edge strength
        edge_array = np.array(edges, dtype=np.float32)
        edge_array = np.clip(edge_array * 2.5, 0, 255).astype(np.uint8)

        # Threshold: keep only strong edges
        edge_array[edge_array < 30] = 0

        # Dilate edges slightly for robustness
        edge_img = Image.fromarray(edge_array)
        edge_img = edge_img.filter(ImageFilter.MaxFilter(3))

        # Return as RGB (ControlNet canny expects 3-channel)
        return edge_img.convert("RGB")

    def _prepare_image(self, image: Image.Image, size: int = 512) -> Image.Image:
        """Resize and normalise an image for diffusion input."""
        return image.convert("RGB").resize((size, size), Image.LANCZOS)

    # ------------------------------------------------------------------
    # Prompt engineering
    # ------------------------------------------------------------------

    def _build_evolution_prompt(
        self,
        brand: str,
        generation_year: int,
        target_year: int,
        design_elements: List[str],
    ) -> str:
        """
        Build a detailed positive prompt for car evolution generation.

        Combines brand, model context, target era cues, and specific
        design elements into an optimised diffusion prompt.

        Example output:
            "BMW 3 Series sedan 2030, futuristic evolved kidney grille, sleek
            aerodynamic profile, electric vehicle, flush door handles, digital
            cockpit, studio lighting, automotive photography, hyper-realistic, 8k"
        """
        era_descriptor = (
            "futuristic" if target_year >= 2030
            else "modern" if target_year >= 2022
            else "contemporary"
        )
        electrification_cue = (
            "electric vehicle, no exhaust pipes, flush charging port"
            if target_year >= 2026
            else "mild hybrid, clean exhaust"
        )

        elements_str = ", ".join(design_elements) if design_elements else ""
        year_gap = target_year - generation_year

        evolution_strength = (
            "radical redesign" if year_gap > 12
            else "significant evolution" if year_gap > 6
            else "refined facelift"
        )

        prompt = (
            f"{brand} sedan {target_year}, {era_descriptor} design, "
            f"{evolution_strength}, {elements_str}, "
            f"{electrification_cue}, "
            f"aerodynamic profile, studio lighting, automotive photography, "
            f"ultra-detailed, hyper-realistic, 8k resolution, "
            f"professional automotive render, photorealistic"
        )
        return prompt.replace(", ,", ",").strip(", ")

    def _build_negative_prompt(self) -> str:
        """Standard negative prompt for automotive renders."""
        return (
            "cartoon, anime, sketch, painting, watercolor, blurry, low quality, "
            "distorted, deformed, ugly, bad proportions, extra wheels, floating, "
            "people, text, watermark, logo, indoors, cluttered background"
        )

    # ------------------------------------------------------------------
    # Public generation methods
    # ------------------------------------------------------------------

    async def predict_next_generation(
        self,
        generation_images: List[Image.Image],
        brand: str,
        brand_trends: dict,
    ) -> GeneratedImage:
        """
        Generate the predicted next generation of a car model.

        Uses the most recent generation's silhouette as ControlNet conditioning
        to preserve overall proportions while evolving surface details.

        Args:
            generation_images: Images of the current/latest generation (ordered oldest-first).
            brand: Brand name (e.g. "BMW", "Toyota").
            brand_trends: Dict with keys: model_name, year_start, design_elements,
                         electrification_pace, design_direction, target_year.

        Returns:
            GeneratedImage with the predicted next generation render.
        """
        self._load_models()

        # Use the most recent image as the conditioning base
        source_image = generation_images[-1] if generation_images else Image.new("RGB", (512, 512), "gray")
        edge_map = self._extract_car_silhouette(source_image)

        year_start = brand_trends.get("year_start", 2020)
        target_year = brand_trends.get("target_year", year_start + 6)
        design_elements = brand_trends.get("design_elements", [])
        model_name = brand_trends.get("model_name", "")

        prompt = self._build_evolution_prompt(brand, year_start, target_year, design_elements)
        if model_name:
            prompt = f"{brand} {model_name}, " + prompt
        negative_prompt = self._build_negative_prompt()

        seed = random.randint(0, 2**32 - 1)
        generator = torch.Generator(device=self.device).manual_seed(seed)

        self.logger.info(
            "generating_next_generation",
            brand=brand,
            target_year=target_year,
            seed=seed,
        )

        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=edge_map,
            num_inference_steps=self.num_inference_steps,
            guidance_scale=self.guidance_scale,
            generator=generator,
            controlnet_conditioning_scale=0.8,
        )

        output_image = result.images[0]

        return GeneratedImage(
            image=output_image,
            prompt_used=prompt,
            seed=seed,
            generation_steps=self.num_inference_steps,
            guidance_scale=self.guidance_scale,
            model_used=f"SD+ControlNet:{self.sd_model_id}",
            metadata={
                "brand": brand,
                "target_year": target_year,
                "source_year": year_start,
                "type": "next_generation_prediction",
            },
        )

    async def generate_retro_modern(
        self,
        classic_car_img: Image.Image,
        brand: str,
        model: str,
        target_year: int,
    ) -> GeneratedImage:
        """
        Reimagine a classic car in a modern era.

        Preserves the iconic proportions and character of the original while
        applying modern design language, materials, and technology cues.

        Args:
            classic_car_img: Image of the classic car to reimagine.
            brand: Brand name (e.g. "BMW").
            model: Model name (e.g. "E30 3 Series").
            target_year: Target era year (e.g. 2026).

        Returns:
            GeneratedImage with the modern reinterpretation.
        """
        self._load_models()

        edge_map = self._extract_car_silhouette(classic_car_img)

        era_cues = (
            "electric, sleek LED lights, digital displays, flush handles, aerodynamic"
            if target_year >= 2025
            else "modern turbocharged, LED daytime running lights, clean bumpers"
        )

        prompt = (
            f"{brand} {model} reimagined in {target_year}, retro-modern design, "
            f"iconic classic proportions reinterpreted, {era_cues}, "
            f"premium automotive photography, studio lighting, hyper-realistic, 8k"
        )
        negative_prompt = self._build_negative_prompt()

        seed = random.randint(0, 2**32 - 1)
        generator = torch.Generator(device=self.device).manual_seed(seed)

        self.logger.info(
            "generating_retro_modern",
            brand=brand,
            model=model,
            target_year=target_year,
        )

        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=edge_map,
            num_inference_steps=self.num_inference_steps,
            guidance_scale=8.0,
            generator=generator,
            controlnet_conditioning_scale=0.75,
        )

        return GeneratedImage(
            image=result.images[0],
            prompt_used=prompt,
            seed=seed,
            generation_steps=self.num_inference_steps,
            guidance_scale=8.0,
            model_used=f"SD+ControlNet:{self.sd_model_id}",
            metadata={
                "brand": brand,
                "model": model,
                "target_year": target_year,
                "type": "retro_modern",
            },
        )

    async def interpolate_generations(
        self,
        gen1_img: Image.Image,
        gen2_img: Image.Image,
        steps: int = 5,
    ) -> List[GeneratedImage]:
        """
        Generate a smooth visual interpolation sequence between two generations.

        Uses img2img with a linearly varying denoising strength to morph
        from gen1 toward gen2. Step 0 is essentially gen1, step N-1 is gen2.

        Args:
            gen1_img: Earlier generation image.
            gen2_img: Later generation image.
            steps: Number of intermediate frames to generate (including endpoints).

        Returns:
            List of GeneratedImage objects forming the interpolation sequence.
        """
        self._load_models()

        steps = max(2, min(steps, 12))  # clamp to sensible range
        results: List[GeneratedImage] = []

        # Prepare a blended conditioning: lerp between the two edge maps
        edge1 = self._extract_car_silhouette(gen1_img)
        edge2 = self._extract_car_silhouette(gen2_img)
        arr1 = np.array(edge1, dtype=np.float32)
        arr2 = np.array(edge2, dtype=np.float32)

        img1_resized = self._prepare_image(gen1_img)

        base_prompt = (
            "automotive design evolution sequence, smooth transition, "
            "studio lighting, automotive photography, hyper-realistic, 8k"
        )
        negative_prompt = self._build_negative_prompt()

        for i in range(steps):
            alpha = i / max(steps - 1, 1)  # 0.0 -> 1.0

            # Blend edge maps
            blended_arr = ((1 - alpha) * arr1 + alpha * arr2).clip(0, 255).astype(np.uint8)
            blended_edge = Image.fromarray(blended_arr)

            # Vary denoising strength: low alpha = preserve gen1, high alpha = move to gen2
            strength = 0.2 + alpha * 0.6  # range [0.2, 0.8]

            seed = random.randint(0, 2**32 - 1)
            generator = torch.Generator(device=self.device).manual_seed(seed)

            # Use img2img with the blended conditioning via ControlNet
            result = self._img2img_pipe(
                prompt=base_prompt,
                negative_prompt=negative_prompt,
                image=img1_resized,
                strength=float(strength),
                num_inference_steps=self.num_inference_steps,
                guidance_scale=self.guidance_scale,
                generator=generator,
            )

            results.append(
                GeneratedImage(
                    image=result.images[0],
                    prompt_used=base_prompt,
                    seed=seed,
                    generation_steps=self.num_inference_steps,
                    guidance_scale=self.guidance_scale,
                    model_used=f"SD-img2img:{self.sd_model_id}",
                    metadata={
                        "interpolation_step": i,
                        "total_steps": steps,
                        "alpha": float(alpha),
                        "type": "interpolation",
                    },
                )
            )

            self.logger.debug("interpolation_step_done", step=i, alpha=alpha)

        return results

    async def synthesize_missing_generation(
        self,
        before_gen: Image.Image,
        after_gen: Image.Image,
        target_year: int,
    ) -> GeneratedImage:
        """
        Generate what a 'missing' generation between two known ones might look like.

        Blends structural features from both boundary generations and uses
        the target year as a temporal anchor for design cues.

        Args:
            before_gen: Image of the preceding generation.
            after_gen: Image of the following generation.
            target_year: The year of the missing generation.

        Returns:
            GeneratedImage representing the synthesised intermediate generation.
        """
        self._load_models()

        # Blend edge maps at 50% to represent a midpoint design
        edge_before = np.array(self._extract_car_silhouette(before_gen), dtype=np.float32)
        edge_after = np.array(self._extract_car_silhouette(after_gen), dtype=np.float32)
        blended_arr = ((edge_before + edge_after) / 2).clip(0, 255).astype(np.uint8)
        blended_edge = Image.fromarray(blended_arr).convert("RGB")

        prompt = (
            f"automotive design {target_year}, intermediate generation, "
            f"transitional design language, balanced evolution, "
            f"studio lighting, automotive photography, hyper-realistic, 8k"
        )
        negative_prompt = self._build_negative_prompt()

        seed = random.randint(0, 2**32 - 1)
        generator = torch.Generator(device=self.device).manual_seed(seed)

        self.logger.info(
            "synthesizing_missing_generation", target_year=target_year, seed=seed
        )

        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=blended_edge,
            num_inference_steps=self.num_inference_steps,
            guidance_scale=self.guidance_scale,
            generator=generator,
            controlnet_conditioning_scale=0.85,
        )

        return GeneratedImage(
            image=result.images[0],
            prompt_used=prompt,
            seed=seed,
            generation_steps=self.num_inference_steps,
            guidance_scale=self.guidance_scale,
            model_used=f"SD+ControlNet:{self.sd_model_id}",
            metadata={
                "target_year": target_year,
                "type": "missing_generation_synthesis",
            },
        )

    async def apply_brand_dna_transfer(
        self,
        source_car: Image.Image,
        target_brand: str,
    ) -> GeneratedImage:
        """
        Apply one brand's design language to another car's silhouette.

        Preserves the structural proportions of the source car while
        reinterpreting the surface design in the style of the target brand.

        Args:
            source_car: Image of the car whose proportions will be preserved.
            target_brand: Target brand whose design language to apply (e.g. "BMW").

        Returns:
            GeneratedImage of the source car reinterpreted as the target brand.

        Example: Toyota Camry redesigned as if it were a BMW 5 Series.
        """
        self._load_models()

        edge_map = self._extract_car_silhouette(source_car)

        brand_signatures = {
            "BMW": "kidney grille, hofmeister kink, twin circular headlights, premium finish",
            "Mercedes-Benz": "star grille, chrome accents, three-pointed star emblem, elegant stance",
            "Audi": "singleframe grille, quattro styling, matrix LED headlights, progressive lines",
            "Porsche": "round headlights, engine lid vents, sports car proportions, widebody arches",
            "Toyota": "keen look design, angular headlights, functional aerodynamics",
            "Ford": "floating grille, blue oval, muscular haunches, athletic stance",
            "Volkswagen": "VW emblem, clean minimalist design, chrome strip, horizontal orientation",
        }

        brand_cues = brand_signatures.get(
            target_brand, f"{target_brand} design language, brand-specific styling elements"
        )

        prompt = (
            f"{target_brand} sedan design language applied, {brand_cues}, "
            f"professional automotive redesign, brand DNA transfer, "
            f"studio lighting, automotive photography, hyper-realistic, 8k"
        )
        negative_prompt = self._build_negative_prompt()

        seed = random.randint(0, 2**32 - 1)
        generator = torch.Generator(device=self.device).manual_seed(seed)

        self.logger.info(
            "applying_brand_dna_transfer", target_brand=target_brand, seed=seed
        )

        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=edge_map,
            num_inference_steps=self.num_inference_steps,
            guidance_scale=8.5,
            generator=generator,
            controlnet_conditioning_scale=0.9,
        )

        return GeneratedImage(
            image=result.images[0],
            prompt_used=prompt,
            seed=seed,
            generation_steps=self.num_inference_steps,
            guidance_scale=8.5,
            model_used=f"SD+ControlNet:{self.sd_model_id}",
            metadata={
                "target_brand": target_brand,
                "type": "brand_dna_transfer",
            },
        )

    # ------------------------------------------------------------------
    # Utility methods
    # ------------------------------------------------------------------

    def image_to_bytes(self, image: Image.Image, format: str = "PNG") -> bytes:
        """Serialise a PIL Image to bytes for API responses or storage."""
        buf = io.BytesIO()
        image.save(buf, format=format)
        return buf.getvalue()

    def is_ready(self) -> bool:
        """Return True if models are loaded and ready for generation."""
        return self.pipe is not None

    def unload_models(self) -> None:
        """Release model memory (useful for low-VRAM environments)."""
        self.pipe = None
        self.controlnet = None
        self._img2img_pipe = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        self.logger.info("generative_models_unloaded")
