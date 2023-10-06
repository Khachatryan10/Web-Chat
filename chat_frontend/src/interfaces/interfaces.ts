export interface MessageSenderI {
    id: string;
    name: string;
    last_name: string;
}

export interface MessageDataI {
    id: string;
    sender: MessageSenderI;
    room_id: string;
    content: string;
    date_time: string;
    seen: boolean;
    receivers: string[];
}

export interface UserToChatI {
    id: string;
    name: string;
    last_name: string;
    birth_date: string;
    email: string;
    room_id: string | undefined;
    last_msg_date_time?: any
}

export interface NotificationI {
    id: string;
    sender_name: string;
    sender_last_name: string;
    sent_by: string;
    sent_to: string;
}

export interface RoomI {
    id: string;
    number_of_unseen_msgs: number;
    num_of_msgs: number;
    room_id: string;
    sender_id: string;
    members: string[];
}

export interface LoginDataI {
    email: string;
    password: string;
}

export interface UserDataFetchI {
    id: string;
    name: string;
    last_name: string;
    birth_date: Date;
    email: string;
}

export type SearchedUserDataI = Omit<UserDataFetchI, "birth_date" | "email">

export interface RegisterDataI {
    name: string;
    lastName: string;
    email: string;
    birthDate: number | undefined;
    password: string;
    confirmation: string
}

export interface CsrfTokenI {
    csrf_token: string
}

export interface KeyValueString {
    [key:string]: string;
}


export interface InputErrorPrgI {
    styles: KeyValueString,
    content: string
}

export interface showMessageEditDivI {
    id: string,
    show: boolean
}

export interface ChangePasswordStateI {
    oldPassword: string,
    newPassword: string,
    confirmation: string,
    textAlign: string,
    color: string,
    fontSize: string,
    height: string,
    content: string,
    changed: boolean
}

export interface NoMessaheYetPropsI {
    amIInCurrentChat: boolean;
}

export interface ChatMessagesFormI {
    wsNotif: React.MutableRefObject<WebSocket | null>;
    messageData: MessageDataI[];
    messageSeen: boolean;
}

export interface NotificationFormI {
    wsNotif: React.MutableRefObject<WebSocket | null>;
}


export interface MyNotifsI {
    myNotif: NotificationI[]
    notificationUpdate: boolean;
}

export interface ChatUsersDataI {
    chatUsersData: UserToChatI[];
}

export interface userDataI {
    id: string;
    name: string;
    lastName:string;
    email: string;
    birth_date: Date | undefined;
    authenticated: boolean;
}