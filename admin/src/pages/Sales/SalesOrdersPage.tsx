import { useSalesOrderMode } from '@/contexts/SalesOrderModeContext';
import { LIVE_ORDERS_DATASET, TEST_ORDERS_DATASET } from './salesOrderShared';
import { SalesOrdersManager } from './SalesOrdersManager';

export function SalesOrdersPage() {
  const { mode } = useSalesOrderMode();
  const dataset = mode === 'test' ? TEST_ORDERS_DATASET : LIVE_ORDERS_DATASET;
  return <SalesOrdersManager dataset={dataset} />;
}
