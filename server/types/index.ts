/**
 * Type Definitions for Soliton Leaves Bot
 */

// ============================================================================
// Email Types
// ============================================================================

export interface EmailAddress {
    address: string;
    name?: string;
}

export interface EmailBody {
    content: string;
    contentType?: string;
}

export interface EmailData {
    id: string;
    subject: string;
    from: {
        emailAddress: EmailAddress;
    };
    toRecipients?: Array<{ emailAddress: EmailAddress }>;
    ccRecipients?: Array<{ emailAddress: EmailAddress }>;
    body: EmailBody;
    bodyPreview: string;
    receivedDateTime: string;
    conversationId: string;
    internetMessageHeaders?: InternetMessageHeader[];
}

export interface InternetMessageHeader {
    name: string;
    value: string;
}

// Resolution result: the triggered email and its sender
export interface ThreadResolutionResult {
    leaveEmail: EmailData;  // The email that triggered the Graph notification
    sender: string;         // Sender address of the email
}

export interface EmailContent {
    from: string;
    subject: string;
    body: string;
    bodyPreview: string;
    conversationContext?: string;
}

// ============================================================================
// Leave Request Types
// ============================================================================

export type LeaveType =
    | "Sick Leave"
    | "Casual Leave"
    | "Privilege Leave"
    | "Comp off"
    | "Maternity Leave"
    | "Paternity Leave"
    | string;

export type TransactionType = "availed" | "cancelled";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface LeaveRequest {
    fromEmail: string;
    fromDate: string | null;
    toDate: string | null;
    leaveType: LeaveType | null;
    transaction: TransactionType;
    reason: string | null;
    confidence: ConfidenceLevel;
    fromSession?: number | null;
    toSession?: number | null;
}

export interface LeaveValidation {
    isValid: boolean;
    missingFields: string[];
    confidence: ConfidenceLevel;
}

// ============================================================================
// GreytHR Types
// ============================================================================

export interface GreytHREmployee {
    employeeId: string;
    employeeNo: string;
    name: string;
    email: string;
}

export interface GreytHRLeaveApplication {
    employeeNo: string;
    fromDate: string;
    toDate: string;
    leaveTypeDescription: LeaveType;
    leaveTransactionTypeDescription: TransactionType;
    reason: string;
    fromSession?: number;
    toSession?: number;
}

export interface GreytHRAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface GreytHRAPIError {
    error: {
        message: string;
        code?: string;
    };
}

export interface GreytHRManager {
    employeeId: number;
    employeeNo: string;
    name: string;
}

export interface GreytHROrgTreeNode {
    manager: GreytHRManager;
    level: number; // 0 = direct manager, -1 = manager's manager, -2 = higher level, etc.
}

export type GreytHROrgTree = GreytHROrgTreeNode[];



// ============================================================================
// Leave Application Result Types
// ============================================================================

export interface LeaveApplicationSuccess {
    success: true;
    employee: {
        employeeNo: string;
        name: string;
        email: string;
    };
    leaveDetails: {
        leaveType: LeaveType | null;
        transaction: TransactionType;
        fromDate: string | null;
        toDate: string | null;
        reason: string | null;
        fromSession?: number | null;
        toSession?: number | null;
    };
    greytHRResponse: any;
    applicationId?: string;
}

export interface LeaveApplicationFailure {
    success: false;
    error: string;
    employee: {
        email: string;
    };
    leaveDetails: {
        leaveType: LeaveType | null;
        transaction: TransactionType;
        fromDate: string | null;
        toDate: string | null;
        fromSession?: number | null;
        toSession?: number | null;
    };
}

export type LeaveApplicationResult = LeaveApplicationSuccess | LeaveApplicationFailure;

// ============================================================================
// Microsoft Graph Types
// ============================================================================

export interface GraphNotification {
    subscriptionId: string;
    subscriptionExpirationDateTime: string;
    changeType: string;
    resource: string;
    resourceData?: {
        id: string;
        [key: string]: any;
    };
    clientState?: string;
}

export interface GraphNotificationPayload {
    value: GraphNotification[];
}

export interface GraphSubscription {
    id: string;
    resource: string;
    changeType: string;
    notificationUrl: string;
    expirationDateTime: string;
    clientState: string;
}

export interface GraphTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// ============================================================================
// OpenAI Types
// ============================================================================

export interface OpenAILeaveExtraction {
    fromEmail: string;
    fromDate: string | null;
    toDate: string | null;
    endDate?: string | null;
    leaveType: LeaveType | null;
    transaction: TransactionType;
    reason: string | null;
    confidence: ConfidenceLevel;
    fromSession?: number | null;
    toSession?: number | null;
}

// ============================================================================
// Environment Configuration Types
// ============================================================================

export interface EnvironmentConfig {
    // Bot Configuration
    BOT_APP_ID: string;
    BOT_APP_SECRET: string;

    // Azure AD Configuration
    TENANT_ID: string;

    // OpenAI Configuration
    OPENAI_API_KEY: string;
    OPENAI_MODEL: string;

    // Server Configuration
    PUBLIC_URL: string;
    PORT: number;
    USE_HTTPS: boolean;

    // Monitored Email
    MONITORED_EMAIL: string;

    // Default leave type when none is specified in the email
    DEFAULT_LEAVE_TYPE: string;

    // Whether the employee's manager must be included in the leave request email
    MANAGER_REQUIRED: boolean;

    // SSL Certificate Configuration
    SSL_KEY_PATH?: string;
    SSL_CERT_PATH?: string;

    // GreytHR Configuration
    GREYTHR_API_URL: string;
    GREYTHR_AUTH_URL: string;
    GREYTHR_DOMAIN: string;
    GREYTHR_USERNAME: string;
    GREYTHR_PASSWORD: string;
}

// ============================================================================
// HTTP Request/Response Types
// ============================================================================

export interface ValidationTokenRequest {
    validationToken: string;
}

export interface EmailNotificationRequest {
    body: GraphNotificationPayload;
    query: Partial<ValidationTokenRequest>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type HTTPMethod = "get" | "post" | "put" | "patch" | "delete";

export interface APIRequestConfig {
    method: HTTPMethod;
    url: string;
    headers: Record<string, string>;
    data?: any;
    maxBodyLength?: number;
}
