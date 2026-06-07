import { TEST_ORDERS_DATASET } from './salesOrderShared';
import { SalesOrdersManager } from './SalesOrdersManager';

/** @deprecated Use SalesOrdersPage with test mode instead. */
export function TestOrders() {
  return <SalesOrdersManager dataset={TEST_ORDERS_DATASET} />;
}
