import { LIVE_ORDERS_DATASET } from './salesOrderShared';
import { SalesOrdersManager } from './SalesOrdersManager';

/** @deprecated Use SalesOrdersPage with live mode instead. */
export function Orders() {
  return <SalesOrdersManager dataset={LIVE_ORDERS_DATASET} />;
}
