import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useSalesOrderMode } from '@/contexts/SalesOrderModeContext';
import { isOrderType, salesPagePath, DEFAULT_ORDER_TYPE } from '@/pages/Sales/orderType';

export function RedirectTestOrdersToSalesOrders() {
  const { orderType } = useParams<{ orderType: string }>();
  const { setMode } = useSalesOrderMode();

  useEffect(() => {
    setMode('test');
  }, [setMode]);

  if (!isOrderType(orderType)) {
    return <Navigate to={salesPagePath('orders', DEFAULT_ORDER_TYPE)} replace />;
  }

  return <Navigate to={salesPagePath('orders', orderType)} replace />;
}
