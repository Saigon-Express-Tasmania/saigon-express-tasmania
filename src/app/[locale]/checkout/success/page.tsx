import CheckoutSuccess from "@/views/CheckoutSuccess";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function LocaleCheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId = params.orderId ? parseInt(params.orderId, 10) : null;

  return (
    <CheckoutSuccess orderId={orderId && !Number.isNaN(orderId) ? orderId : null} />
  );
}
