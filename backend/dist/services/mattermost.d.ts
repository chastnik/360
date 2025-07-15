interface MattermostUser {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    nickname: string;
    position: string;
    roles: string;
    locale: string;
    timezone: {
        useAutomaticTimezone: boolean;
        automaticTimezone: string;
        manualTimezone: string;
    };
}
interface MattermostChannel {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    team_id: string;
    type: string;
    display_name: string;
    name: string;
    header: string;
    purpose: string;
    last_post_at: number;
    total_msg_count: number;
    extra_update_at: number;
    creator_id: string;
}
interface MattermostPost {
    id: string;
    create_at: number;
    update_at: number;
    edit_at: number;
    delete_at: number;
    is_pinned: boolean;
    user_id: string;
    channel_id: string;
    root_id: string;
    parent_id: string;
    original_id: string;
    message: string;
    type: string;
    props: any;
    hashtags: string;
    pending_post_id: string;
    reply_count: number;
    last_reply_at: number;
    participants: string[];
    metadata: {
        embeds: any[];
        emojis: any[];
        files: any[];
        images: any[];
        reactions: any[];
    };
}
interface MattermostNotification {
    recipientUsername: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
}
declare class MattermostService {
    private client;
    private baseUrl;
    private token;
    private teamId;
    private botUsername;
    constructor();
    testConnection(): Promise<boolean>;
    getUserByUsername(username: string): Promise<MattermostUser | null>;
    getUserByEmail(email: string): Promise<MattermostUser | null>;
    getTeamUsers(): Promise<MattermostUser[]>;
    createDirectChannel(userId: string): Promise<MattermostChannel | null>;
    private getBotUserId;
    sendMessage(channelId: string, message: string, props?: any): Promise<MattermostPost | null>;
    sendNotification(notification: MattermostNotification): Promise<boolean>;
    notifyAssessmentCycleStart(participantUsername: string, cycleTitle: string): Promise<boolean>;
    notifyRespondentAssessment(respondentUsername: string, participantName: string, cycleTitle: string, respondentId: string): Promise<boolean>;
    sendAssessmentReminder(respondentUsername: string, participantName: string, cycleTitle: string, respondentId: string): Promise<boolean>;
    notifyAssessmentComplete(participantUsername: string, cycleTitle: string, participantId: string): Promise<boolean>;
    notifyCycleComplete(adminUsername: string, cycleTitle: string, cycleId: string): Promise<boolean>;
    sendBulkNotifications(notifications: MattermostNotification[]): Promise<{
        success: number;
        failed: number;
    }>;
}
declare const _default: MattermostService;
export default _default;
export { MattermostUser, MattermostChannel, MattermostPost, MattermostNotification };
//# sourceMappingURL=mattermost.d.ts.map