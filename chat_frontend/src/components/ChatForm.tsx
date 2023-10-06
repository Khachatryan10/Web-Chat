import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { userDataI } from "../interfaces/interfaces";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { faCommentDots, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { MessageDataI, UserToChatI, NotificationI, RoomI } from "../interfaces/interfaces";
import NoMessageYetForm from "./NoMessageYetForm";
import UserProfileForm from "./UserProfileForm";
import ChatMessagesForm from "./ChatMessagesForm";
import NotificationForm from "./NotificationForm";
import { useDispatch } from "react-redux";
import { addNotifications, removeAllNotifications, removeNotification, updateNotification } from "../features/myNotificationsSlice";
import { addChatUsersData, removeAllChatUsers, removeUsersByRoomId, removeUsersByUserId, updateChatUsersData } from "../features/chatUsersDataSlice";

export default function ChatForm():JSX.Element {
    const [messageInput, setMessageInput] = useState<string>("")
    const [messageData, setMessageData] = useState<MessageDataI[]>([])
    const refChatContainer = useRef<HTMLDivElement>(null)
    const refChatNavbarContainer = useRef<HTMLDivElement>(null)
    const userData:userDataI = useSelector((state:RootState) => state.userData)
    const authenticated:boolean = useSelector((state:RootState) => state.userData.authenticated)
    const [userToChat, setUserToChat] = useState<UserToChatI>()
    const [pageDataNum, setPageDataNum] = useState<number>(5)
    const [chatPageSize, setChatPageSize] = useState<number>(18)
    const [chatRoomData, setChatRoomData] = useState<RoomI[]>([])
    const [displayDeleteMsgsDiv, setDisplayDeleteMsgsDiv] = useState<boolean>(false)
    const dispatch = useDispatch()
    const [messageSeen, setMessageSeen] = useState<boolean>(false)
    const [isNotificationSent, setIsNotificationSent] = useState<boolean>()
    const [timeToLoad, setTimeToLoad] = useState<boolean>(false)
    const [receivedNewMsg, setReceivedNewMsg] = useState<boolean>(false)
    const [currentChatUserId, setCurrentChatUserId] = useState<string | undefined>("")
    const wsChat = useRef<WebSocket | null>(null)
    const wsNotif = useRef<WebSocket | null>(null)
    const params = useParams()
    const usersDataChat:UserToChatI[] = useSelector((state:RootState) => state.chatUsersData.chatUsersData)
    const messagesSentByMe = messageData.filter(message => message.sender.id === userData.id && message.room_id === params.chat_id)
    const areAllMessagesSeen = messagesSentByMe.every(message => message.seen === true)
    const notificationUpdate:boolean = useSelector((state:RootState) => state.notificationData.notificationUpdate)

    useEffect(() => {
        fetch("http://127.0.0.1:8000/get_all_my_rooms")
        .then(response => response.json())
        .then((roomData: RoomI[]) => {
            roomData.map(room => {
                setChatRoomData(prevState => [...prevState, room])
            })
        })
    },[notificationUpdate, userData.id, messageData, authenticated])

    useEffect(() => {
        if (params.chat_id && params.chat_id !== userData.id){
            fetch(`http://127.0.0.1:8000/get_current_chat_user/${params.chat_id}`)
                .then(response => response.json())
                .then((data:RoomI[]) => {
                    if (data[0].members && userData.id){
                        setCurrentChatUserId(data[0].members.filter(member => member !== userData.id)[0])
                    }  
            })
        }
    },[params.chat_id])

    const scrollDown = ():void => {
        refChatContainer.current?.scrollBy({top: refChatContainer.current.scrollHeight, behavior: "smooth"})
    }
    const updateAsSeen = (chatRoomId: string | undefined):void => {
        if (wsNotif.current?.readyState === wsNotif.current?.OPEN && chatRoomId === params.chat_id && params.chat_id !== userData.id){
            wsNotif.current?.send(JSON.stringify({
                "type": "update_to_seen",
                "roomIdToUpdate": chatRoomId,
                "senderIdToUpdate": userData.id, 
            }))

        } 
    }

    const changeNumOfUnseenMessages = (roomId: string): void => {
            setChatRoomData(prevState => {
                return prevState.map(dt => {
                    if (dt.room_id === roomId){
                        dt.number_of_unseen_msgs = 0
                    }
                    
                    return dt
                })
            }) 
        
    }

    useEffect(() => {
        setMessageSeen(false)
        if (params.chat_id && userData.id !== params.chat_id){
            updateAsSeen(params.chat_id)  
            setMessageSeen(areAllMessagesSeen)
            changeNumOfUnseenMessages(params.chat_id)
        }
    },[params.chat_id, userData.id, messageData]) 

    useEffect(() => {
        setMessageData([]) 
        if (params.chat_id){
                const myWebSocket = new WebSocket(`ws://${window.location.host}/ws/chat/${params.chat_id}/`)
                wsChat.current = myWebSocket
                
                wsChat.current.onmessage = function(e: MessageEvent):void {
                    const messageObj = JSON.parse(e.data);
                    const {message, id, sender, room_id, receivers, date_time} = messageObj
                    const newMessage:MessageDataI = {id: id, sender: sender, room_id: room_id, date_time: date_time,
                        content: message, seen: false,
                        receivers: receivers }
                    if (params.chat_id === room_id){ 
                        updateAsSeen(room_id)
                    }

                    if (params.chat_id === room_id && userData.id === sender.id || receivers.includes(userData.id)){
                        setMessageData(prevState => [...prevState, newMessage])
                    }
                };
            
                wsChat.current.onclose = function(e: CloseEvent):void {
                    console.error("connection is closed")
                }
                    
                return () => {
                    wsChat.current?.close()
                }        
            }
    },[params.chat_id])
    

    useEffect(() => {
        const myWebSocket = new WebSocket(`ws://${window.location.host}/ws/notif/`)
        wsNotif.current = myWebSocket
        
        wsNotif.current.onmessage = function(e: MessageEvent):void {
            const messageObj = JSON.parse(e.data);
            const { roomData, notification, remove_request_data, accept_request_data, is_request_sent, is_seen_data, deleted_msg_id, hide_msg_data, is_all_deleted_data, rmv_room_data } = messageObj

                if (rmv_room_data && rmv_room_data.member_id === userData.id || rmv_room_data.sender_id === userData.id){
                    dispatch(removeUsersByRoomId(rmv_room_data.room_id))
                    if (rmv_room_data.sender_id === params.user_id || rmv_room_data.sender_id === userData.id){
                        setIsNotificationSent(false)
                        dispatch(updateNotification())
                    }

                    dispatch(removeUsersByUserId(rmv_room_data.sender_id))
                    dispatch(updateNotification())
                }

                if (is_all_deleted_data !== ""){
                    if (userData.id === is_all_deleted_data.user_id_dlt_for){
                        setMessageData([])
                        setDisplayDeleteMsgsDiv(false)
                    }
                    else {
                        setMessageData(prevState => prevState.filter(message => message.sender.id === userData.id))
                    }
                }

                if (hide_msg_data !== "" && hide_msg_data.user_id === userData.id){
                    setMessageData(prevState => prevState.filter(message => message.id !== hide_msg_data.msg_id))
                }

                if (deleted_msg_id){
                    setMessageData(prevState => prevState.filter(message => message.id !== deleted_msg_id))
                }
                
                if (is_seen_data){
                    if (is_seen_data !== "" && params.chat_id !== userData.id && params.chat_id === is_seen_data.room_id){
                        if (is_seen_data.user_id !== userData.id){
                            setMessageSeen(is_seen_data.is_seen)
                        }
                        else {
                            changeNumOfUnseenMessages(is_seen_data.room_id)
                        }
                    }

                }
                
                if (notification !== ""){
                    if (is_request_sent === "is_sent" && notification.sent_by === userData.id && notification.sent_to === params.user_id){   
                        setIsNotificationSent(true)
                    }
                }
                
                if (remove_request_data !== ""){
                    if (is_request_sent === "is_removed" && remove_request_data.sender === userData.id && remove_request_data.sent_to === params.user_id){
                        setIsNotificationSent(false)
                    } 
                }
            
                if (accept_request_data.id){
                    if (accept_request_data !== "" && accept_request_data.sender_id === userData.id){
                        const newUserData:UserToChatI = { id: accept_request_data.id,
                                                name: accept_request_data.name,
                                                last_name: accept_request_data.last_name,
                                                birth_date: accept_request_data.birth_date,
                                                email: accept_request_data.email,
                                                room_id: accept_request_data.room_id }
                        
                        dispatch(addChatUsersData(newUserData))
                        dispatch(updateNotification())
                        dispatch(removeNotification(accept_request_data.my_id)) 
                    }
                    else if (accept_request_data !== "" && accept_request_data.my_id === userData.id) {
                        dispatch(updateNotification())
                        dispatch(removeNotification(accept_request_data.sender_id))
                    }
                }
    
                if (notification !== "" && notification.sent_to === userData.id){
                    dispatch(addNotifications(notification))
                }

                if (remove_request_data !== ""){
                if (remove_request_data.sent_to === userData.id){
                    dispatch(removeNotification(remove_request_data.sender))
                }
                }

            setChatRoomData(prevState => {
                return prevState.map(room => {
                    if (room.room_id === roomData.room_id){
                        return {
                            ...room,
                            sender_id: roomData.sender_id,
                            number_of_unseen_msgs: roomData.number_of_unseen_msgs
                        }
                    }
                    return room
                    
                })
            })
        };
        
        wsNotif.current.onclose = function(e: CloseEvent):void {
            console.error("connection is closed")
        }
        return () => {
            wsNotif.current?.close()
        }
    
    },[notificationUpdate, userData.id, params.chat_id, params.user_id]) 

    const allMsg = chatRoomData.filter(room => room.room_id === params.chat_id)[0]?.num_of_msgs
    const handleChatScroll = (): void => {
        if (refChatContainer.current && pageDataNum < allMsg){
                if (Math.floor(refChatContainer.current.scrollTop) === refChatContainer.current.clientHeight - refChatContainer.current.scrollHeight){
                    refChatContainer.current.scrollBy({top: 35, behavior: "smooth"})
                    setPageDataNum(prevState => prevState + 5)
                }
                
            } 
    }

    useEffect(() => {
        if (messageData.every(message => message.room_id === params.chat_id) || pageDataNum === 5){
        if (params.chat_id ){
            fetch(`http://127.0.0.1:8000/get_messages/${params.chat_id}/${pageDataNum}`)
            .then(response => response.json())
            .then((messageDataFetched:MessageDataI[]) => {
                setMessageData(messageDataFetched.reverse())
            })
            }
        }
        else {
            setPageDataNum(5)
        }
    },[params.chat_id, pageDataNum, authenticated]) 

useEffect(() => {
                fetch(`http://127.0.0.1:8000/get_chat_members`) 
                .then(response => response.json())
                .then((data:UserToChatI[]) => {
                        data.map(fetchedChatUserData => {
                        
                            dispatch(addChatUsersData(fetchedChatUserData))
                        

                            if (fetchedChatUserData.last_msg_date_time && usersDataChat.some(dt => dt.id === fetchedChatUserData.id && dt.last_msg_date_time !== fetchedChatUserData.last_msg_date_time)){
                                dispatch(updateChatUsersData({"id": fetchedChatUserData.id, "data": fetchedChatUserData}))
                            }
                        })
                })
},[notificationUpdate, receivedNewMsg, authenticated])

    useEffect(() => {
        if (params.user_id){
        fetch(`http://127.0.0.1:8000/get_chat_user/${params.user_id}`)
            .then(response => response.json())
            .then((user) => {
                setUserToChat(prevSate => {
                    return{
                        ...prevSate,
                        id: user.id,
                        name: user.name,
                        last_name: user.last_name,
                        birth_date: user.birth_date,
                        email: user.email,
                        room_id : params.chat_id
                    }
                })
            })
        
        fetch(`http://127.0.0.1:8000/notifications_sent_by_me/${userData.id}/${params.user_id}`)
            .then(response => response.json())
            .then((messages: NotificationI) => {
                if (messages.sent_by === userData.id && messages.sent_to === params.user_id){
                    setIsNotificationSent(true)
                }
                else {
                    setIsNotificationSent(false)
                }
            })
    }
        
},[params.user_id, params.chat_id, userData.id])   
    
    useEffect(() => {
        scrollDown()
    },[])
    
    const handleSendMessage = ():void => {
        if (wsChat.current?.readyState === wsChat.current?.OPEN && messageInput.trim().length && wsNotif.current?.readyState === wsNotif.current?.OPEN && params.chat_id){
            wsChat.current?.send(JSON.stringify({
                "message": messageInput,
                "sendTo": params.chat_id !== userData.id ? currentChatUserId: userData.id, 
            }))

            wsNotif.current?.send(JSON.stringify({
                "type": "get_unseen_messages",
                "roomId": params.chat_id,
                "senderId": userData.id
            }))
            setMessageInput("")
            }
}

    const handleChatRequest = (): void => {
        if (wsNotif.current?.readyState === wsNotif.current?.OPEN){
            wsNotif.current?.send(JSON.stringify({
                "type": "send_request",
                "senderName": userData.name,
                "senderLastName": userData.lastName,
                "sentBy": userData.id,
                "sentTo": params.user_id,
            }))
            setIsNotificationSent(true)
    }   
}

const handleRemoveRequest = (): void => {
    if (wsNotif.current?.readyState === wsNotif.current?.OPEN && params.user_id){
            wsNotif.current?.send(JSON.stringify({
                "type": "remove_request",
                "sender": userData.id,
                "sentTo": params.user_id,
        }))
        setIsNotificationSent(false)
    }
}

    useEffect(() => {
        setTimeToLoad(false)
        const timeoutFn: NodeJS.Timeout = setTimeout(() => {
            setTimeToLoad(true)
        }, 800)

        return () => {
            clearTimeout(timeoutFn)
        }
    },[params.chat_id])

    const showRequestDiv:boolean = !usersDataChat.some(user => user.id === params.user_id) && params.user_id !== userData.id
    
    const handleInputValueChange = (e:React.ChangeEvent<HTMLInputElement>):void => {
        setMessageInput(e.target.value)
    }

    const amIInCurrentChat = usersDataChat.some(room => room.room_id === params.chat_id) || params.chat_id === userData.id
    const handleDeleteAll = ():void => {
        if (wsNotif.current?.readyState === wsNotif.current?.OPEN && params.chat_id){
        wsNotif.current?.send(JSON.stringify({
                "type": "delete_all_msgs",
                "userId": userData.id,
                "roomId": params.chat_id
        }))
        }
    }

    const handleChatNavbarScroll = ():void => { 
        if (refChatNavbarContainer.current){
            if (Math.floor(refChatNavbarContainer.current.scrollTop) + 5 > refChatNavbarContainer.current.scrollHeight - refChatNavbarContainer.current.clientHeight){
                setChatPageSize(prevState => prevState + 5)
            }
        }
    }

    useEffect(() => {
        chatRoomData.map((data) => {
                usersDataChat.filter(user => user.id !== userData.id).map(chat => {
                    if (data.sender_id !== userData.id && data.room_id === chat.room_id && data.number_of_unseen_msgs > 0){
                        setReceivedNewMsg(!receivedNewMsg)
                }
            })
        })
    },[chatRoomData])

    useEffect(() => {
        dispatch(removeAllChatUsers())
        dispatch(removeAllNotifications())
    },[authenticated])

    return(
        <>
            <nav className="chatNavbar" ref={refChatNavbarContainer} onScroll={handleChatNavbarScroll}>
                <ul> 
                    {usersDataChat.slice(0, chatPageSize).filter(user => user.id !== userData.id).map(chat => (
                        <Link to={`/chat/${chat.room_id}/`} className="Link" onClick={() => messageData.at(-1)?.sender.id !== userData.id ? updateAsSeen(chat.room_id): undefined} title={`${chat.name} ${chat.last_name}`}>
                            <li className={chat.room_id === params.chat_id ? "currentChatFriend": ""} key={chat.id}>
                                    {chatRoomData.map((data) => {
                                        if (data.sender_id !== userData.id && params.chat_id !== data.room_id && data.room_id === chat.room_id && data.number_of_unseen_msgs > 0){
                                            return (
                                                <FontAwesomeIcon icon={faCommentDots} className={"messageNotifIcon"} />
                                            )
                                    }
                                })}
                                {chat.name[0].toUpperCase()}
                                </li>  
                        </Link> 
                    ))}
                </ul>
            </nav>
            {params.user_id && <UserProfileForm wsNotif={wsNotif}/>}
            {timeToLoad && !messageData.length && params.chat_id && <NoMessageYetForm amIInCurrentChat={amIInCurrentChat} />}
            {showRequestDiv && params.user_id && timeToLoad && <div className="requestToChatDiv">
                <h5>You should have {userToChat?.name}'s permission to start chatting</h5>
                <button className={isNotificationSent ? "removeRequestBtn": "requestBtn"} 
                    onClick={isNotificationSent ? handleRemoveRequest: handleChatRequest}>
                    {isNotificationSent ? "Requested": "Request"}
                </button>
            </div>}

            {params.chat_id && <div className="chatMessagesContainer" ref={refChatContainer} onScroll={handleChatScroll}>
                <ChatMessagesForm wsNotif={wsNotif} messageData={messageData} messageSeen={messageSeen}/> 
            </div>
            }
            {params.chat_id && <div className="chatFormContainer">
                {displayDeleteMsgsDiv &&
                    <div className="coverPageFormDiv">
                        <div className="coverPageFormDiv__container">
                            <h5>Do You Want To Delete All Chat Messages</h5>
                    <div className="coverPageFormDiv__btnsContainer">
                        <button className="coverPageFormDiv__deleteBtn" onClick={handleDeleteAll}>Delete</button>
                        <button className="coverPageFormDiv__cancelBtn" onClick={() => setDisplayDeleteMsgsDiv(false)}>Cancel</button>
                    </div>
                        </div>
                    </div>}
                <input type="text" className="chatFormContainer__textInput" disabled={!amIInCurrentChat} style={{cursor: !amIInCurrentChat ? "not-allowed": ""}} value={messageInput} placeholder="Send message" onChange={(e) => handleInputValueChange(e)} onKeyUp={(e) => e.key === "Enter" ? handleSendMessage(): undefined} />
                <button className="chatFormContainer__sendBtn" disabled={!amIInCurrentChat} style={{cursor: !amIInCurrentChat ? "not-allowed": ""}} onClick={handleSendMessage}>Send</button>
                {messageData.length > 0 && <FontAwesomeIcon icon={faTrash} className="deleteAllMessagesIcon" onClick={() => setDisplayDeleteMsgsDiv(true)} />}
                </div> }
                <NotificationForm wsNotif={wsNotif}/>
        </>
    )
}