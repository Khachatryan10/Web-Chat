import { useEffect, useRef, useState } from "react";
import { shortenName } from "../extraFunctions/functions";
import { NotificationFormI, NotificationI } from "../interfaces/interfaces";
import { faBell, faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from "react-router-dom";
import { RootState } from "../app/store";
import { useSelector } from "react-redux";
import { userDataI } from "../interfaces/interfaces";
import { addNotifications } from "../features/myNotificationsSlice";
import { useDispatch } from "react-redux";


export default function NotificationForm(props:NotificationFormI):JSX.Element {

    const [isNotificationDivOpen, setIsNotificationDivOpen] = useState<boolean>(false)
    const userData:userDataI = useSelector((state:RootState) => state.userData)
    const { wsNotif } = props
    const notificationContainerRef = useRef<HTMLDivElement>(null)
    const myNotifications:NotificationI[] = useSelector((state:RootState) => state.notificationData.myNotif)
    const notificationUpdate:boolean = useSelector((state:RootState) => state.notificationData.notificationUpdate)
    const [pageSize, setPageSize] = useState<number>(5)

    const dispatch = useDispatch()

    useEffect(() => {
        fetch(`http://127.0.0.1:8000/my_notifications/${pageSize}`)
        .then(response => response.json())
        .then((data:NotificationI[]) => {
                data.map(notif => {
                    dispatch(addNotifications(notif))
                })
        })
    },[notificationUpdate, pageSize])


    const handleAcceptRequest = (senderId: string):void => {
        if (wsNotif.current?.readyState === wsNotif.current?.OPEN && senderId){
            wsNotif.current?.send(JSON.stringify({
                "type": "accept_request",
                "senderId": senderId,
                "myId": userData.id,
            }))
        }
    }

    const handleRefuseRequest = (senderId: string):void => {
        if (wsNotif.current?.readyState === wsNotif.current?.OPEN && senderId){
            wsNotif.current?.send(JSON.stringify({
                "type": "refuse_request",
                "senderId": senderId,
                "myId": userData.id,
            }))
        }
    }

    const handleNotifScroll = ():void => {
        if (notificationContainerRef.current){
            if (Math.ceil(notificationContainerRef.current.scrollTop) + 5 > notificationContainerRef.current.scrollHeight - notificationContainerRef.current.clientHeight){
                setPageSize(prevState => prevState + 5)
            }
        }
    }

    useEffect(() => {
        setPageSize(5)
    },[isNotificationDivOpen])

    useEffect(() => {
        if (myNotifications.length === 0){
            setIsNotificationDivOpen(false)
        }
    },[myNotifications.length])

    return(
        <>
            <div className={isNotificationDivOpen ? "notificationContainerOpen": "notificationContainer"}
            style={{"cursor": !isNotificationDivOpen ?"pointer": ""}} onClick={() => !isNotificationDivOpen && 
            myNotifications.length ? setIsNotificationDivOpen(true): undefined} ref={notificationContainerRef} onScroll={handleNotifScroll}>
            
                {isNotificationDivOpen && <FontAwesomeIcon icon={faCircleXmark} className="closeIcon" onClick={() => setIsNotificationDivOpen(false)} />}
                {isNotificationDivOpen && 
                <ul className="usersUlNotif">
                    {myNotifications.map(notification => (
                        <li className="userLiNotif" key={notification.id}>
                            <p className="nameLastNameNotif"><Link className="Link" to={`/user/${notification.sent_by}/`}>{shortenName(`${notification.sender_name} ${notification.sender_last_name} `)}</Link>sent you a chat request</p>
                            <div className="acceptRefuseBtnsDiv">
                                <button className="acceptBtn" onClick={() => handleAcceptRequest(notification.sent_by)}>Accept</button>
                                <button className="refuseBtn" onClick={() => handleRefuseRequest(notification.sent_by)}>Refuse</button>
                            </div>
                        </li>
                        ))
                    }
                </ul>}
                {!isNotificationDivOpen && myNotifications.length > 0 && 
                    <div className="hasNotificationsIcon">
                    </div>}
                {!isNotificationDivOpen && <FontAwesomeIcon icon={faBell} className="bellIcon" />}
                
            </div>
        </>
    )
}