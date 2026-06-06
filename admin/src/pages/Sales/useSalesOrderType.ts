import { useParams } from 'react-router-dom';
import {
  DEFAULT_ORDER_TYPE,
  formatOrderTypeLabel,
  isOrderType,
  salesPagePath,
  type OrderType,
} from './orderType';

type SalesPage = 'orders' | 'test-orders' | 'draft-orders' | 'archived-orders';

export function useSalesOrderType(page: SalesPage, pageLabel: string) {
  const { orderType: rawOrderType } = useParams<{ orderType: string }>();

  if (!isOrderType(rawOrderType)) {
    return {
      orderType: null as null,
      pageTitle: pageLabel,
      tableTitle: pageLabel,
      redirectTo: salesPagePath(page, DEFAULT_ORDER_TYPE),
    };
  }

  const typeLabel = formatOrderTypeLabel(rawOrderType);
  const titledLabel = `${typeLabel} ${pageLabel}`;

  return {
    orderType: rawOrderType as OrderType,
    pageTitle: titledLabel,
    tableTitle: titledLabel,
    redirectTo: null,
  };
}
