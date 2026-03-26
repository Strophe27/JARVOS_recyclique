/**
 * Types générés automatiquement à partir de la spécification OpenAPI
 * Source: ../api/openapi.json
 * Généré le: 2026-03-26T22:20:31.855Z
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ButtonType {
  DONATION = 'donation',
  RECYCLING = 'recycling'
}
export enum CashSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed'
}
export enum CashSessionStep {
  ENTRY = 'ENTRY',
  SALE = 'SALE',
  EXIT = 'EXIT'
}
export enum DepositStatus {
  PENDING_AUDIO = 'pending_audio',
  AUDIO_PROCESSING = 'audio_processing',
  PENDING_VALIDATION = 'pending_validation',
  CLASSIFICATION_FAILED = 'classification_failed',
  CLASSIFIED = 'classified',
  VALIDATED = 'validated',
  COMPLETED = 'completed'
}
export enum Destination {
  MAGASIN = 'MAGASIN',
  RECYCLAGE = 'RECYCLAGE',
  DECHETERIE = 'DECHETERIE'
}
export enum EEECategory {
  SMALL_APPLIANCE = 'small_appliance',
  LARGE_APPLIANCE = 'large_appliance',
  IT_EQUIPMENT = 'it_equipment',
  LIGHTING = 'lighting',
  TOOLS = 'tools',
  TOYS = 'toys',
  MEDICAL_DEVICES = 'medical_devices',
  MONITORING_CONTROL = 'monitoring_control',
  AUTOMATIC_DISPENSERS = 'automatic_dispensers',
  OTHER = 'other'
}
export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed'
}
export enum EmailType {
  PASSWORD_RESET = 'password_reset',
  WELCOME = 'welcome',
  NOTIFICATION = 'notification',
  ADMIN_NOTIFICATION = 'admin_notification',
  OTHER = 'other'
}
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  CHECK = 'check',
  FREE = 'free'
}
export enum UserRole {
  SUPER_ADMIN = 'super-admin',
  ADMIN = 'admin',
  USER = 'user'
}
export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active'
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface ActivityEvent {
  id: string | string;
  event_type: string;
  description: string;
  date: string;
  metadata?: object | any;
}
export interface AdminResponse {
  data?: object | any;
  message: string;
  success?: boolean;
}
export interface AdminUser {
  id: string | string;
  telegram_id?: string | any;
  username?: string | any;
  first_name?: string | any;
  last_name?: string | any;
  full_name?: string | any;
  email?: string | any;
  phone_number?: string | any;
  address?: string | any;
  notes?: string | any;
  skills?: string | any;
  availability?: string | any;
  role: UserRole;
  status: UserStatus;
  is_active: boolean;
  site_id?: string | string | any;
  created_at: string;
  updated_at: string;
}
export interface AlertThresholds_Input {
  cash_discrepancy: number;
  low_inventory: number;
}
export interface AlertThresholds_Output {
  cashDiscrepancy: number;
  lowInventory: number;
}
export interface AlertThresholdsResponse {
  thresholds: AlertThresholds_Output;
  siteId?: string | any;
}
export interface AlertThresholdsUpdate {
  thresholds: AlertThresholds_Input;
  site_id?: string | any;
}
export interface AssignPermissionsToGroupRequest {
  permission_ids: string[];
}
export interface AssignUsersToGroupRequest {
  user_ids: string[];
}
export interface AuthUser {
  id: string;
  username?: string | any;
  first_name?: string | any;
  last_name?: string | any;
  role: string;
  status?: string | any;
  is_active: boolean;
  created_at?: string | any;
  updated_at?: string | any;
}
export interface Body_analyze_categories_import_v1_categories_import_analyze_post {
  file: string;
}
export interface Body_analyze_legacy_import_v1_admin_import_legacy_analyze_post {
  file: string;
  confidence_threshold?: number | any;
  llm_model_id?: string | any;
}
export interface Body_clean_legacy_import_v1_admin_import_legacy_clean_post {
  file: string;
}
export interface Body_execute_legacy_import_v1_admin_import_legacy_execute_post {
  csv_file: string;
  mapping_file: string;
  import_date?: string | any;
}
export interface Body_export_remapped_legacy_import_v1_admin_import_legacy_export_remapped_post {
  csv_file: string;
  mapping_file: string;
}
export interface Body_import_database_v1_admin_db_import_post {
  file: string;
}
export interface Body_preview_legacy_import_v1_admin_import_legacy_preview_post {
  csv_file: string;
  mapping_file: string;
}
export interface Body_validate_legacy_import_v1_admin_import_legacy_validate_post {
  file: string;
}
export interface BulkExportFilters {
  date_from?: string | any;
  date_to?: string | any;
  status?: string | any;
  operator_id?: string | any;
  site_id?: string | any;
  search?: string | any;
  include_empty?: boolean;
}
export interface BulkExportRequest {
  filters: BulkExportFilters;
  format: string;
}
export interface BulkReceptionExportFilters {
  date_from?: string | any;
  date_to?: string | any;
  status?: string | any;
  benevole_id?: string | any;
  search?: string | any;
  include_empty?: boolean;
}
export interface BulkReceptionExportRequest {
  filters: BulkReceptionExportFilters;
  format: string;
}
export interface CashRegisterCreate {
  name: string;
  location?: string | any;
  site_id?: string | any;
  is_active?: boolean;
  workflow_options?: object;
  enable_virtual?: boolean;
  enable_deferred?: boolean;
}
export interface CashRegisterResponse {
  name: string;
  location?: string | any;
  site_id?: string | any;
  is_active?: boolean;
  workflow_options?: object;
  enable_virtual?: boolean;
  enable_deferred?: boolean;
  id: string;
}
export interface CashRegisterUpdate {
  name?: string | any;
  location?: string | any;
  site_id?: string | any;
  is_active?: boolean | any;
  workflow_options?: object | any;
  enable_virtual?: boolean | any;
  enable_deferred?: boolean | any;
}
export interface CashSessionClose {
  actual_amount: number;
  variance_comment?: string | any;
}
export interface CashSessionCreate {
  operator_id: string;
  site_id: string;
  register_id?: string | any;
  initial_amount: number;
  opened_at?: string | any;
}
export interface CashSessionDetailResponse {
  operator_id: string;
  site_id: string;
  register_id?: string | any;
  initial_amount: number;
  id: string;
  current_amount: number;
  status: CashSessionStatus;
  opened_at: string;
  closed_at?: string | any;
  total_sales?: number | any;
  total_items?: number | any;
  number_of_sales?: number | any;
  total_donations?: number | any;
  total_weight_out?: number | any;
  closing_amount?: number | any;
  actual_amount?: number | any;
  variance?: number | any;
  variance_comment?: string | any;
  report_download_url?: string | any;
  report_email_sent?: boolean | any;
  register_options?: object | any;
  sales: SaleDetail[];
  operator_name?: string | any;
  site_name?: string | any;
}
export interface CashSessionListResponse {
  data: CashSessionResponse[];
  total: number;
  skip: number;
  limit: number;
}
export interface CashSessionResponse {
  operator_id: string;
  site_id: string;
  register_id?: string | any;
  initial_amount: number;
  id: string;
  current_amount: number;
  status: CashSessionStatus;
  opened_at: string;
  closed_at?: string | any;
  total_sales?: number | any;
  total_items?: number | any;
  number_of_sales?: number | any;
  total_donations?: number | any;
  total_weight_out?: number | any;
  closing_amount?: number | any;
  actual_amount?: number | any;
  variance?: number | any;
  variance_comment?: string | any;
  report_download_url?: string | any;
  report_email_sent?: boolean | any;
  register_options?: object | any;
}
export interface CashSessionStats {
  total_sessions: number;
  open_sessions: number;
  closed_sessions: number;
  total_sales: number;
  total_items: number;
  number_of_sales: number;
  total_donations: number;
  total_weight_sold: number;
  average_session_duration?: number | any;
}
export interface CashSessionStepResponse {
  session_id: string;
  current_step?: CashSessionStep | any;
  step_start_time?: string | any;
  last_activity?: string | any;
  step_duration_seconds?: number | any;
}
export interface CashSessionStepUpdate {
  step: CashSessionStep;
  timestamp?: string | any;
}
export interface CashSessionSummary {
  sessionId: string;
  siteId: string;
  operator: string;
  openedAt: string;
  closedAt?: string | any;
  initialAmount: number;
  currentAmount: number;
  totalSales: number;
  totalItems: number;
  status: string;
}
export interface CashSessionUpdate {
  status?: CashSessionStatus | any;
  current_amount?: number | any;
  total_sales?: number | any;
  total_items?: number | any;
}
export interface CategoryCreate {
  name: string;
  official_name?: string | any;
  parent_id?: string | any;
  price?: number | string | any;
  max_price?: number | string | any;
  display_order?: number | any;
  display_order_entry?: number | any;
  is_visible?: boolean | any;
  shortcut_key?: string | any;
}
export interface CategoryImportAnalyzeResponse {
  session_id: string | any;
  summary: object;
  sample: object[];
  errors: string[];
}
export interface CategoryImportExecuteRequest {
  session_id: string;
  delete_existing?: boolean;
}
export interface CategoryMapping {
  category_id: string;
  category_name: string;
  confidence: number;
}
export interface CategoryRead {
  name: string;
  official_name?: string | any;
  id: string;
  is_active: boolean;
  parent_id?: string | any;
  price?: string | any;
  max_price?: string | any;
  display_order: number;
  display_order_entry: number;
  is_visible: boolean;
  shortcut_key?: string | any;
  created_at: string;
  updated_at: string;
  deleted_at?: string | any;
}
export interface CategoryStats {
  category_name: string;
  total_weight: string;
  total_items: number;
}
export interface CategoryUpdate {
  name?: string | any;
  official_name?: string | any;
  is_active?: boolean | any;
  parent_id?: string | any;
  price?: number | string | any;
  max_price?: number | string | any;
  display_order?: number | any;
  display_order_entry?: number | any;
  is_visible?: boolean | any;
  shortcut_key?: string | any;
}
export interface CategoryWithChildren {
  name: string;
  official_name?: string | any;
  id: string;
  is_active: boolean;
  parent_id?: string | any;
  price?: string | any;
  max_price?: string | any;
  display_order: number;
  display_order_entry: number;
  is_visible: boolean;
  shortcut_key?: string | any;
  created_at: string;
  updated_at: string;
  deleted_at?: string | any;
  children?: CategoryWithChildren[];
}
export interface CloseResponse {
  status: string;
}
export interface CreateLigneRequest {
  ticket_id: string;
  category_id: string;
  poids_kg: number | string;
  destination: Destination;
  notes?: string | any;
  is_exit?: boolean | any;
}
export interface CreateTicketRequest {
  poste_id: string;
}
export interface CreateTicketResponse {
  id: string;
}
export interface DashboardMetrics {
  totalSessions: number;
  openSessions: number;
  closedSessions: number;
  totalSales: number;
  totalItems: number;
  averageSessionDuration?: number | any;
}
export interface DashboardStatsResponse {
  metrics: DashboardMetrics;
  encryptedMetrics: string;
  recentReports?: RecentReport[];
  recentSessions?: CashSessionSummary[];
}
export interface DepositCreate {
  user_id: string;
  site_id?: string | any;
  telegram_user_id?: string | any;
  audio_file_path?: string | any;
  status?: DepositStatus | any;
  category?: EEECategory | any;
  weight?: number | any;
  description?: string | any;
  ai_classification?: string | any;
  ai_confidence?: number | any;
  transcription?: string | any;
  eee_category?: EEECategory | any;
  confidence_score?: number | any;
  alternative_categories?: object | object[] | any;
}
export interface DepositFinalize {
  final_category?: EEECategory | any;
  correction_applied?: boolean;
  validated?: boolean;
}
export interface DepositResponse {
  user_id: string;
  site_id?: string | any;
  telegram_user_id?: string | any;
  audio_file_path?: string | any;
  status?: DepositStatus | any;
  category?: EEECategory | any;
  weight?: number | any;
  description?: string | any;
  ai_classification?: string | any;
  ai_confidence?: number | any;
  transcription?: string | any;
  eee_category?: EEECategory | any;
  confidence_score?: number | any;
  alternative_categories?: object | object[] | any;
  id: string;
  created_at: string;
  updated_at: string;
}
export interface DisplayOrderEntryUpdate {
  display_order_entry: number;
}
export interface DisplayOrderUpdate {
  display_order: number;
}
export interface EmailLogListResponse {
  email_logs: EmailLogResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
export interface EmailLogResponse {
  recipient_email: string;
  recipient_name?: string | any;
  subject: string;
  body_text?: string | any;
  body_html?: string | any;
  email_type: EmailType;
  status: EmailStatus;
  external_id?: string | any;
  error_message?: string | any;
  sent_at?: string | any;
  delivered_at?: string | any;
  opened_at?: string | any;
  clicked_at?: string | any;
  bounced_at?: string | any;
  created_at: string;
  updated_at: string;
  user_id?: string | any;
  additional_data?: string | any;
  id: string;
}
export interface EmailSettingsResponse {
  from_name: string;
  from_address: string;
  default_recipient?: string | any;
  has_api_key: boolean;
  webhook_secret_configured: boolean;
}
export interface EmailSettingsUpdate {
  from_name?: string | any;
  from_address?: string | any;
  default_recipient?: string | any;
}
export interface EmailTestRequest {
  to_email: string;
}
export interface ForcePasswordRequest {
  new_password: string;
  reason?: string | any;
}
export interface ForgotPasswordRequest {
  email: string;
}
export interface ForgotPasswordResponse {
  message: string;
}
export interface GroupCreate {
  name: string;
  description?: string | any;
}
export interface GroupDetailResponse {
  name: string;
  description?: string | any;
  id: string;
  created_at: string;
  updated_at: string;
  users?: UserResponse[];
  permissions?: PermissionResponse[];
}
export interface GroupResponse {
  name: string;
  description?: string | any;
  id: string;
  created_at: string;
  updated_at: string;
  user_ids?: string[];
  permission_ids?: string[];
}
export interface GroupUpdate {
  name?: string | any;
  description?: string | any;
}
export interface HTTPValidationError {
  detail?: ValidationError[];
}
export interface ImportReport {
  postes_created: number;
  postes_reused: number;
  tickets_created: number;
  lignes_imported: number;
  errors: string[];
  total_errors: number;
}
export interface ImportSummaryByCategory {
  category_name: string;
  category_id: string;
  line_count: number;
  total_kilos: number;
}
export interface ImportSummaryByDate {
  date: string;
  line_count: number;
  total_kilos: number;
}
export interface LLMModelInfo {
  id: string;
  name: string;
  provider?: string | any;
  is_free?: boolean;
  context_length?: number | any;
  pricing?: object | any;
}
export interface LLMModelsResponse {
  models: LLMModelInfo[];
  error?: string | any;
  default_model_id?: string | any;
}
export interface LLMOnlyRequest {
  unmapped_categories: string[];
  llm_model_id?: string | any;
}
export interface LLMOnlyResponse {
  mappings: object;
  statistics: LLMOnlyStatistics;
}
export interface LLMOnlyStatistics {
  llm_attempted?: boolean;
  llm_model_used?: string | any;
  llm_batches_total?: number;
  llm_batches_succeeded?: number;
  llm_batches_failed?: number;
  llm_mapped_categories?: number;
  llm_unmapped_after_llm?: number;
  llm_last_error?: string | any;
  llm_avg_confidence?: number | any;
  llm_provider_used?: string | any;
}
export interface LegacyImportAnalyzeResponse {
  mappings: object;
  unmapped: string[];
  statistics: LegacyImportStatistics;
  errors: string[];
}
export interface LegacyImportCleanResponse {
  cleaned_csv_base64: string;
  filename: string;
  statistics: LegacyImportCleanStatistics;
}
export interface LegacyImportCleanStatistics {
  total_lines: number;
  cleaned_lines: number;
  excluded_lines: number;
  orphan_lines: number;
  dates_normalized: number;
  weights_rounded: number;
  date_distribution?: object;
}
export interface LegacyImportExecuteResponse {
  report: ImportReport;
  message?: string;
}
export interface LegacyImportPreviewResponse {
  total_lines: number;
  total_kilos: number;
  unique_dates: number;
  unique_categories: number;
  by_category: ImportSummaryByCategory[];
  by_date: ImportSummaryByDate[];
  unmapped_categories: string[];
}
export interface LegacyImportStatistics {
  total_lines: number;
  valid_lines: number;
  error_lines: number;
  unique_categories: number;
  mapped_categories: number;
  unmapped_categories: number;
  llm_attempted?: boolean;
  llm_model_used?: string | any;
  llm_batches_total?: number;
  llm_batches_succeeded?: number;
  llm_batches_failed?: number;
  llm_mapped_categories?: number;
  llm_unmapped_after_llm?: number;
  llm_last_error?: string | any;
  llm_avg_confidence?: number | any;
  llm_provider_used?: string | any;
}
export interface LegacyImportValidationResponse {
  is_valid: boolean;
  errors?: string[];
  warnings?: string[];
  statistics: LegacyImportValidationStatistics;
}
export interface LegacyImportValidationStatistics {
  total_lines: number;
  valid_lines: number;
  invalid_lines: number;
  missing_columns?: string[];
  extra_columns?: string[];
  date_errors: number;
  weight_errors: number;
  structure_issues: number;
}
export interface LigneDepotListResponse {
  lignes: LigneDepotReportResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
export interface LigneDepotReportResponse {
  id: string;
  ticket_id: string;
  poste_id: string;
  benevole_username: string;
  category_label: string;
  poids_kg: string;
  destination: Destination;
  notes?: string | any;
  created_at: string;
}
export interface LigneResponse {
  id: string;
  ticket_id: string;
  category_id: string;
  category_label: string;
  poids_kg: string;
  destination: Destination;
  notes?: string | any;
  is_exit: boolean;
}
export interface LigneWeightUpdate {
  poids_kg: number | string;
}
export interface LoginRequest {
  username: string;
  password: string;
}
export interface LoginResponse {
  access_token: string;
  refresh_token?: string | any;
  token_type?: string;
  expires_in?: number | any;
  user: AuthUser;
}
export interface LogoutResponse {
  message: string;
}
export interface OpenPosteRequest {
  opened_at?: string | any;
}
export interface OpenPosteResponse {
  id: string;
  status: string;
}
export interface PasswordChangeRequest {
  new_password: string;
  confirm_password: string;
}
export interface PaymentCreate {
  payment_method: PaymentMethod;
  amount: number;
}
export interface PaymentDetail {
  id: string;
  sale_id: string;
  payment_method: string;
  amount: number;
  created_at: string;
}
export interface PaymentResponse {
  payment_method: PaymentMethod;
  amount: number;
  id: string;
  sale_id: string;
  created_at: string;
}
export interface PendingUserResponse {
  id: string | string;
  telegram_id?: string | any;
  username?: string | any;
  first_name?: string | any;
  last_name?: string | any;
  full_name?: string | any;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}
export interface PermissionCreate {
  name: string;
  description?: string | any;
}
export interface PermissionResponse {
  name: string;
  description?: string | any;
  id: string;
  created_at: string;
  updated_at: string;
}
export interface PermissionUpdate {
  name?: string | any;
  description?: string | any;
}
export interface PinAuthRequest {
  user_id: string;
  pin: string;
}
export interface PinAuthResponse {
  access_token: string;
  token_type?: string;
  user_id: string;
  username: string;
  role: string;
}
export interface PinSetRequest {
  pin: string;
}
export interface PresetButtonWithCategory {
  name: string;
  category_id: string;
  preset_price: string;
  button_type: ButtonType;
  sort_order?: number | any;
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category_name: string;
}
export interface RecentReport {
  filename: string;
  downloadUrl: string;
  generatedAt: string;
  sizeBytes: number;
}
export interface ReceptionLiveStatsResponse {
  tickets_open: number;
  tickets_closed_24h: number;
  items_received: number;
  turnover_eur: number;
  donations_eur: number;
  weight_in: number;
  weight_out: number;
}
export interface ReceptionSummaryStats {
  total_weight: string;
  total_items: number;
  unique_categories: number;
}
export interface RefreshTokenRequest {
  refresh_token: string;
}
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in: number;
}
export interface ReportEntry {
  filename: string;
  size_bytes: number;
  modified_at: string;
  download_url: string;
}
export interface ReportListResponse {
  reports: ReportEntry[];
  total: number;
}
export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}
export interface ResetPasswordResponse {
  message: string;
}
export interface SaleCreate {
  cash_session_id: string;
  items: SaleItemCreate[];
  total_amount: number;
  donation?: number | any;
  payment_method?: PaymentMethod | any;
  payments?: PaymentCreate[] | any;
  note?: string | any;
}
export interface SaleDetail {
  id: string;
  total_amount: number;
  donation?: number | any;
  payment_method?: string | any;
  payments?: PaymentDetail[] | any;
  sale_date: string;
  created_at: string;
  operator_id?: string | any;
  operator_name?: string | any;
  note?: string | any;
  total_weight?: number | any;
}
export interface SaleItemCreate {
  category: string;
  quantity: number;
  weight: number;
  unit_price: number;
  total_price: number;
  preset_id?: string | any;
  notes?: string | any;
}
export interface SaleItemResponse {
  category: string;
  quantity: number;
  weight: number;
  unit_price: number;
  total_price: number;
  preset_id?: string | any;
  notes?: string | any;
  id: string;
  sale_id: string;
}
export interface SaleItemUpdate {
  quantity?: number | any;
  weight?: number | any;
  unit_price?: number | any;
  preset_id?: string | any;
  notes?: string | any;
}
export interface SaleItemWeightUpdate {
  weight: number;
}
export interface SaleResponse {
  cash_session_id: string;
  total_amount: number;
  donation?: number | any;
  payment_method?: PaymentMethod | any;
  note?: string | any;
  id: string;
  sale_date?: string | any;
  created_at: string;
  updated_at: string;
  items?: SaleItemResponse[];
  payments?: PaymentResponse[];
}
export interface SaleUpdate {
  note?: string | any;
}
export interface SessionSettingsResponse {
  token_expiration_minutes: number;
}
export interface SessionSettingsUpdate {
  token_expiration_minutes: number;
}
export interface SettingCreate {
  key: string;
  value: string;
}
export interface SettingResponse {
  key: string;
  value: string;
  id: string;
  created_at: string;
  updated_at: string;
}
export interface SettingUpdate {
  value: string;
}
export interface SignupRequest {
  username: string;
  password: string;
  email?: string | any;
}
export interface SignupResponse {
  message: string;
  user_id: string;
  status: string;
}
export interface SiteCreate {
  name: string;
  address?: string | any;
  city?: string | any;
  postal_code?: string | any;
  country?: string | any;
  configuration?: object | any;
  is_active?: boolean;
}
export interface SiteResponse {
  name: string;
  address?: string | any;
  city?: string | any;
  postal_code?: string | any;
  country?: string | any;
  configuration?: object | any;
  is_active?: boolean;
  id: string;
  created_at: string;
  updated_at: string;
}
export interface SiteUpdate {
  name?: string | any;
  address?: string | any;
  city?: string | any;
  postal_code?: string | any;
  country?: string | any;
  configuration?: object | any;
  is_active?: boolean | any;
}
export interface TestEmailRequest {
  to_email: string;
}
export interface TicketDetailResponse {
  id: string;
  poste_id: string;
  benevole_username: string;
  created_at: string;
  closed_at?: string | any;
  status: string;
  lignes: LigneResponse[];
}
export interface TicketListResponse {
  tickets: TicketSummaryResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
export interface TicketSummaryResponse {
  id: string;
  poste_id: string;
  benevole_username: string;
  created_at: string;
  closed_at?: string | any;
  status: string;
  total_lignes: number;
  total_poids: string;
  poids_entree: string;
  poids_direct: string;
  poids_sortie: string;
}
export interface TransactionLogRequest {
  event: string;
  session_id: string;
  cart_state?: object | any;
  cart_state_before?: object | any;
  anomaly?: boolean | any;
  details?: string | any;
}
export interface UnifiedLiveStatsResponse {
  tickets_count: number;
  last_ticket_amount: number;
  ca: number;
  donations: number;
  weight_out_sales: number;
  tickets_open: number;
  tickets_closed_24h: number;
  items_received: number;
  weight_in: number;
  weight_out: number;
  period_start: string;
  period_end: string;
}
export interface UpdateLigneRequest {
  category_id?: string | any;
  poids_kg?: number | string | any;
  destination?: Destination | any;
  notes?: string | any;
  is_exit?: boolean | any;
}
export interface UserApprovalRequest {
  message?: string | any;
}
export interface UserCreate {
  telegram_id?: string | any;
  username?: string | any;
  first_name?: string | any;
  last_name?: string | any;
  email?: string | any;
  phone_number?: string | any;
  address?: string | any;
  notes?: string | any;
  skills?: string | any;
  availability?: string | any;
  role?: UserRole;
  status?: UserStatus;
  is_active?: boolean;
  site_id?: string | any;
  password: string;
}
export interface UserGroupUpdateRequest {
  group_ids: string[];
}
export interface UserHistoryResponse {
  user_id: string | string;
  events: ActivityEvent[];
  total_count: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}
export interface UserProfileUpdate {
  first_name?: string | any;
  last_name?: string | any;
  username?: string | any;
  role?: UserRole | any;
  status?: UserStatus | any;
}
export interface UserRejectionRequest {
  reason?: string | any;
}
export interface UserResponse {
  telegram_id?: string | any;
  username?: string | any;
  first_name?: string | any;
  last_name?: string | any;
  email?: string | any;
  phone_number?: string | any;
  address?: string | any;
  notes?: string | any;
  skills?: string | any;
  availability?: string | any;
  role?: UserRole;
  status?: UserStatus;
  is_active?: boolean;
  site_id?: string | any;
  id: string;
  created_at: string;
  updated_at: string;
}
export interface UserRoleUpdate {
  role: UserRole;
}
export interface UserSelfUpdate {
  username?: string | any;
  first_name?: string | any;
  last_name?: string | any;
  email?: string | any;
  phone_number?: string | any;
  address?: string | any;
}
export interface UserStatusInfo {
  user_id: string | string;
  is_online: boolean;
  last_login?: string | any;
  minutes_since_login?: number | any;
}
export interface UserStatusUpdate {
  status: UserStatus;
  is_active: boolean;
  reason?: string | any;
}
export interface UserStatusesResponse {
  user_statuses: UserStatusInfo[];
  total_count: number;
  online_count: number;
  offline_count: number;
  timestamp: string;
}
export interface UserUpdate {
  username?: string | any;
  first_name?: string | any;
  last_name?: string | any;
  email?: string | any;
  phone_number?: string | any;
  address?: string | any;
  notes?: string | any;
  skills?: string | any;
  availability?: string | any;
  role?: UserRole | any;
  status?: UserStatus | any;
  is_active?: boolean | any;
  site_id?: string | any;
}
export interface ValidationError {
  loc: string | number[];
  msg: string;
  type: string;
}
export interface VisibilityUpdate {
  is_visible: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  detail: string;
  type?: string;
  code?: string;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}