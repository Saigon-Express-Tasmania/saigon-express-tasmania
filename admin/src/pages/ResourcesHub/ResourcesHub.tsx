import { DOCUMENT_PAGE_CONFIG } from './franchiseResourceShared';
import { FranchiseResourceAdminPage } from './FranchiseResourceAdminPage';

export default function ResourcesHub() {
  return <FranchiseResourceAdminPage config={DOCUMENT_PAGE_CONFIG} />;
}
