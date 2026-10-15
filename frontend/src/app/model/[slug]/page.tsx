import ModelPage from './_client'

export async function generateStaticParams() { return []; }

export default function Page({ params }: { params: { slug: string } }) {
  return <ModelPage params={params} />;
}
