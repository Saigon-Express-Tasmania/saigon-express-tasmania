-- Seed franchise document categories and catalogue rows for the Resources Hub.
-- Files referenced in content_file / attached_files use storage paths under
-- franchise-documents/; upload the matching assets to those paths before publishing.

-- ---------------------------------------------------------------------------
-- Categories (document place)
-- ---------------------------------------------------------------------------
insert into public.franchise_resource_taxonomies (
  place,
  kind,
  alias,
  label,
  sort_order,
  is_active
)
values
  ('document', 'category', 'legal-documents', 'Legal Documents', 1, true),
  ('document', 'category', 'brand-documents', 'Brand Documents', 2, true),
  ('document', 'category', 'operations-manuals', 'Operations Manuals', 3, true),
  ('document', 'category', 'recipe-portion-control', 'Recipe & Portion Control', 4, true),
  ('document', 'category', 'training-documents', 'Training Documents', 5, true),
  ('document', 'category', 'report-documents', 'Report Documents', 6, true),
  ('document', 'category', 'marketing', 'Marketing', 7, true),
  ('document', 'category', 'supplier-central-kitchen', 'Supplier & Central Kitchen', 8, true),
  ('document', 'category', 'hr-staff', 'HR & Staff', 9, true),
  ('document', 'category', 'compliance', 'Compliance', 10, true)
on conflict (kind, alias) do update
set
  place = excluded.place,
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
with seed_documents (
  category_alias,
  sort_order,
  title,
  slug,
  content_file,
  attached_files
) as (
  values
    -- 1. Legal Documents
    ('legal-documents', 1, 'Franchise Agreement', 'franchise-agreement', null::text, '[]'::jsonb),
    ('legal-documents', 2, 'Disclosure Document', 'disclosure-document', null, '[]'::jsonb),
    ('legal-documents', 3, 'Information Statement', 'information-statement', null, '[]'::jsonb),
    ('legal-documents', 4, 'Franchise Register Information', 'franchise-register-information', null, '[]'::jsonb),
    ('legal-documents', 5, 'Privacy Policy', 'privacy-policy', null, '[]'::jsonb),
    ('legal-documents', 6, 'Confidentiality Agreement', 'confidentiality-agreement', null, '[]'::jsonb),
    ('legal-documents', 7, 'Trademark Licence', 'trademark-licence', null, '[]'::jsonb),

    -- 2. Brand Documents
    ('brand-documents', 1, 'Brand Manual', 'brand-manual', null, '[]'::jsonb),
    ('brand-documents', 2, 'Logo Files', 'logo-files', null, '[]'::jsonb),
    ('brand-documents', 3, 'Colour Palette', 'colour-palette', null, '[]'::jsonb),
    ('brand-documents', 4, 'Font Guide', 'font-guide', null, '[]'::jsonb),
    ('brand-documents', 5, 'Packaging Guide', 'packaging-guide', null, '[]'::jsonb),
    ('brand-documents', 6, 'Signage Guide', 'signage-guide', null, '[]'::jsonb),

    -- 3. Operations Manuals
    ('operations-manuals', 1, 'Kitchen Operations Manual', 'kitchen-operations-manual', null, '[]'::jsonb),
    ('operations-manuals', 2, 'FOH Manual', 'foh-manual', null, '[]'::jsonb),
    ('operations-manuals', 3, 'Store Opening Manual', 'store-opening-manual', null, '[]'::jsonb),
    ('operations-manuals', 4, 'Store Closing Manual', 'store-closing-manual', null, '[]'::jsonb),
    ('operations-manuals', 5, 'Food Safety Manual', 'food-safety-manual', null, '[]'::jsonb),
    ('operations-manuals', 6, 'Cleaning Manual', 'cleaning-manual', null, '[]'::jsonb),
    (
      'operations-manuals',
      7,
      'Uber Eats & DoorDash Manual',
      'uber-eats-doordash-manual',
      null,
      jsonb_build_array(
        jsonb_build_object(
          'name', 'DoorDash Tablet How-To Guide',
          'url', 'franchise-documents/DoorDash_Tablet_How-To_Guide-August-22.pdf',
          'mime_type', 'application/pdf'
        ),
        jsonb_build_object(
          'name', 'Uber Eats Orders Training Guide',
          'url', 'franchise-documents/Uber_Eats_Orders_Training_Guide_USC_2021.pdf',
          'mime_type', 'application/pdf'
        )
      )
    ),

    -- 4. Recipe & Portion Control
    (
      'recipe-portion-control',
      1,
      'Recipe Cards',
      'recipe-cards',
      'franchise-documents/Saigon Express Preparation Recipe 2026 v1.pdf',
      '[]'::jsonb
    ),
    ('recipe-portion-control', 2, 'Portion Charts', 'portion-charts', null, '[]'::jsonb),
    ('recipe-portion-control', 3, 'Sauce Recipes', 'sauce-recipes', null, '[]'::jsonb),
    ('recipe-portion-control', 4, 'Prep Sheets', 'prep-sheets', null, '[]'::jsonb),
    ('recipe-portion-control', 5, 'Catering Portion Guide', 'catering-portion-guide', null, '[]'::jsonb),
    ('recipe-portion-control', 6, 'Costing Sheets', 'costing-sheets', null, '[]'::jsonb),

    -- 5. Training Documents
    (
      'training-documents',
      1,
      'Franchisee Training Program',
      'franchisee-training-program',
      'franchise-documents/FOH Training Program.docx',
      '[]'::jsonb
    ),
    (
      'training-documents',
      2,
      'Staff Training Checklist',
      'staff-training-checklist',
      'franchise-documents/BOH Training Program.docx',
      '[]'::jsonb
    ),
    ('training-documents', 3, 'Manager Training Checklist', 'manager-training-checklist', null, '[]'::jsonb),
    ('training-documents', 4, 'Quiz & Assessment', 'quiz-assessment', null, '[]'::jsonb),
    (
      'training-documents',
      5,
      'Delivery Platform Staff Training Manual',
      'delivery-platform-staff-training-manual',
      'franchise-documents/Saigon_Express Delivery Platform Staff Training Manual 2026.pdf',
      '[]'::jsonb
    ),
    ('training-documents', 6, 'Sign-off Forms', 'sign-off-forms', null, '[]'::jsonb),

    -- 6. Report Documents
    (
      'report-documents',
      1,
      'Daily Sales Report',
      'daily-sales-report',
      'franchise-documents/Saigon Express_Daily Sales Report.xlsx',
      '[]'::jsonb
    ),
    ('report-documents', 2, 'Weekly KPI Report', 'weekly-kpi-report', null, '[]'::jsonb),
    ('report-documents', 3, 'Royalty Report', 'royalty-report', null, '[]'::jsonb),
    ('report-documents', 4, 'Marketing Levy Report', 'marketing-levy-report', null, '[]'::jsonb),
    (
      'report-documents',
      5,
      'Stocktake Template',
      'stocktake-template',
      'franchise-documents/Saigon Express_Stocktake Template.xlsx',
      '[]'::jsonb
    ),
    ('report-documents', 6, 'Labour Cost Tracker', 'labour-cost-tracker', null, '[]'::jsonb),

    -- 7. Marketing
    (
      'marketing',
      1,
      'Grand Opening Plan',
      'grand-opening-plan',
      'franchise-documents/Saigon Express_Grand Opening Marketing Plan.docx',
      '[]'::jsonb
    ),
    (
      'marketing',
      2,
      'Monthly Marketing Calendar',
      'monthly-marketing-calendar',
      'franchise-documents/Saigon Express_Marketing Calendar.xlsx',
      '[]'::jsonb
    ),
    ('marketing', 3, 'Social Media Templates', 'social-media-templates', null, '[]'::jsonb),
    ('marketing', 4, 'Poster Templates', 'poster-templates', null, '[]'::jsonb),
    ('marketing', 5, 'Review Response Templates', 'review-response-templates', null, '[]'::jsonb),
    (
      'marketing',
      6,
      'Local Area Marketing Guide',
      'local-area-marketing-guide',
      'franchise-documents/Saigon Express_LAM Guide Tasmania.docx',
      '[]'::jsonb
    ),

    -- 8. Supplier & Central Kitchen
    ('supplier-central-kitchen', 1, 'Approved Supplier List', 'approved-supplier-list', null, '[]'::jsonb),
    (
      'supplier-central-kitchen',
      2,
      'Central Kitchen Order Form',
      'central-kitchen-order-form',
      'franchise-documents/Saigon Express_Central Kitchen Order Form.xlsx',
      '[]'::jsonb
    ),
    ('supplier-central-kitchen', 3, 'Delivery Schedule', 'delivery-schedule', null, '[]'::jsonb),
    (
      'supplier-central-kitchen',
      4,
      'Product Specification Sheets',
      'product-specification-sheets',
      'franchise-documents/Saigon Express_Product Spec Sheets.xlsx',
      '[]'::jsonb
    ),
    (
      'supplier-central-kitchen',
      5,
      'Quality Complaint Form',
      'quality-complaint-form',
      'franchise-documents/Saigon Express_Quality Complaint Form.docx',
      '[]'::jsonb
    ),

    -- 9. HR & Staff
    (
      'hr-staff',
      1,
      'Position Descriptions',
      'position-descriptions',
      'franchise-documents/Saigon Express_Job Descriptions.docx',
      '[]'::jsonb
    ),
    (
      'hr-staff',
      2,
      'Staff Handbook',
      'staff-handbook',
      'franchise-documents/Saigon Express_Staff Handbook.docx',
      '[]'::jsonb
    ),
    ('hr-staff', 3, 'Uniform Policy', 'uniform-policy', null, '[]'::jsonb),
    (
      'hr-staff',
      4,
      'Leave Request Form',
      'leave-request-form',
      'franchise-documents/Saigon Express_Leave Request Form.docx',
      '[]'::jsonb
    ),
    (
      'hr-staff',
      5,
      'Incident Report Form',
      'incident-report-form',
      'franchise-documents/Saigon Express_Incident Report.docx',
      '[]'::jsonb
    ),
    (
      'hr-staff',
      6,
      'Warning Letter Template',
      'warning-letter-template',
      'franchise-documents/Saigon Express_Warning Letters.docx',
      '[]'::jsonb
    ),

    -- 10. Compliance
    (
      'compliance',
      1,
      'Food Safety Logs + Temperature Logs + WHS Checklist',
      'food-safety-logs-temperature-logs-whs-checklist',
      'franchise-documents/Saigon Express_Food Safety Logs.xlsx',
      '[]'::jsonb
    ),
    (
      'compliance',
      2,
      'Cleaning Logs + Pest Control Records',
      'cleaning-logs-pest-control-records',
      'franchise-documents/Saigon Express_Cleaning and Pest Logs.xlsx',
      '[]'::jsonb
    ),
    (
      'compliance',
      3,
      'Liquor Licence Rules',
      'liquor-licence-rules',
      'franchise-documents/Saigon_Express_Liquor Licence Guide.docx',
      '[]'::jsonb
    ),
    ('compliance', 4, 'Insurance Documents', 'insurance-documents', null, '[]'::jsonb)
)
insert into public.franchise_resources (
  type,
  title,
  slug,
  category_id,
  author_name,
  content_file,
  attached_files,
  sort_order,
  is_published,
  published_at,
  metadata
)
select
  'document'::public.franchise_resource_type,
  seed.title,
  seed.slug,
  taxonomy.id,
  'Franchise HQ',
  seed.content_file,
  seed.attached_files,
  seed.sort_order,
  true,
  now(),
  jsonb_build_object(
    'seed',
    jsonb_build_object(
      'source', '20260625140000_franchise_resources_seed_documents',
      'category_alias', seed.category_alias
    )
  )
from seed_documents seed
join public.franchise_resource_taxonomies taxonomy
  on taxonomy.kind = 'category'
 and taxonomy.alias = seed.category_alias
on conflict (slug) do update
set
  type = excluded.type,
  title = excluded.title,
  category_id = excluded.category_id,
  author_name = excluded.author_name,
  content_file = excluded.content_file,
  attached_files = excluded.attached_files,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  published_at = coalesce(public.franchise_resources.published_at, excluded.published_at),
  metadata = public.franchise_resources.metadata || excluded.metadata;
