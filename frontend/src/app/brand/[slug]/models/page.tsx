import BrandModelsPage from './_client'

export async function generateStaticParams() { return []; }

export default function Page({ params }: { params: { slug: string } }) {
  return <BrandModelsPage params={params} />;
}
