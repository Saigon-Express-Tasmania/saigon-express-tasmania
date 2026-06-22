import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useSalesOrderMode } from '@/contexts/SalesOrderModeContext';
import {
  isOrderType,
  salesOrderDetailsPath,
  DEFAULT_ORDER_TYPE,
  salesPagePath,
} from '@/pages/Sales/orderType';

export function RedirectTestOrderDetailsToSalesOrderDetails() {
  const { orderType, orderId } = useParams<{ orderType: string; orderId: string }>();
  const { setMode } = useSalesOrderMode();

  useEffect(() => {
    setMode('test');
  }, [setMode]);

  if (!isOrderType(orderType) || !orderId || !/^\d+$/.test(orderId)) {
    return <Navigate to={salesPagePath('orders', DEFAULT_ORDER_TYPE)} replace />;
  }

  return (
    <Navigate
      to={salesOrderDetailsPath('orders', orderType, Number(orderId))}
      replace
    />
  );
}
