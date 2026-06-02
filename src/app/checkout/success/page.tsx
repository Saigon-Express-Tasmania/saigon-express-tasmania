import CheckoutSuccess from "@/views/CheckoutSuccess";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ orderId?: string; sessionId?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId = params.orderId ? parseInt(params.orderId, 10) : null;
  const sessionId = params.sessionId?.trim() || null;

  return (
    <CheckoutSuccess
      orderId={orderId && !Number.isNaN(orderId) ? orderId : null}
      sessionId={sessionId}
    />
  );
}
