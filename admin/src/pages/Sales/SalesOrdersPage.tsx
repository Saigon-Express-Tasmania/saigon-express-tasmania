import { useSalesOrderMode } from '@/contexts/SalesOrderModeContext';
import { Orders } from './Orders';
import { TestOrders } from './TestOrders';

export function SalesOrdersPage() {
  const { mode } = useSalesOrderMode();
  return mode === 'test' ? <TestOrders /> : <Orders />;
}
