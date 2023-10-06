import { useParams, Link } from "react-router-dom"
import { ChatMessagesFormI, showMessageEditDivI } from "../interfaces/interfaces"
import { RootState } from "../app/store"
import { useSelector } from "react-redux"
import { useState } from "react"
import { userDataI } from "../interfaces/interfaces"
import { faEye, faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { shortenName, reverseDate } from "../extraFunctions/functions"
import { useDispatch } from "react-redux"

export default function ChatMessagesForm (props: ChatMessagesFormI): JSX.Element {
    const params = useParams()
    const userData:userDataI = useSelector((state:RootState) => state.userData)
    const [showMessageEditDiv, setShowMessageEditDiv] = useState<showMessageEditDivI>({
        "id": "",
        "show": false
    })
    const dispatch = useDispatch()
    const { wsNotif, messageData, messageSeen } = props
    const handleShowEditMessageDiv = (msgId: string) => {
        setShowMessageEditDiv(prevState => {
            return{
                ...prevState,
                id: msgId,
                show: msgId === prevState.id && prevState.show ? false: true
            }
        })
    }

    const handleDeleteMessage = (messageId: string):void => {
        if (wsNotif.current?.readyState === wsNotif.current?.OPEN && messageId){
            wsNotif.current?.send(JSON.stringify({
                    "type": "delete_message",
                    "messageId": messageId
            }))
        }
    }

    const handleHideMessage = (messageId: string):void => {
    if (wsNotif.current?.readyState === wsNotif.current?.OPEN && messageId){
            wsNotif.current?.send(JSON.stringify({
                "type": "hide_message",
                "messageId": messageId,
                "userId": userData.id
            }))
        }
    }

    const handleDisableDeleteMsgDiv = ():void => {
        setShowMessageEditDiv(prevState => {
            return{
                ...prevState,
                show: false
            }
        })
    } 

    return(
        <div>
            <ul className="chatMessagesContainer__ul">
                {messageData.map(message => (
                    <>
                        <li>
                        <FontAwesomeIcon icon={faEllipsisVertical} className="messageEllipsisIcon" onClick={() => handleShowEditMessageDiv(message.id)} />
                        {showMessageEditDiv.id === message.id  && showMessageEditDiv.show  && <div className="coverPageFormDiv">
                        <div className="coverPageFormDiv__container">
                        <div className="coverPageFormDiv__btnsContainer">
                        {message.sender.id === userData.id && params.chat_id !== userData.id && <button className="deleteMsgBtn" onClick={() => handleDeleteMessage(message.id)}>Delete For All</button>}
                        {params.chat_id !== userData.id && <button className="hideMsgBtn" onClick={() => handleHideMessage(message.id)}>Delete For Me</button>}
                        {params.chat_id === userData.id && <button className="deleteMsgBtn" onClick={() => handleDeleteMessage(message.id)}>Delete</button>}
                        <br />
                        <button className="cancelDltMsg" onClick={() => handleDisableDeleteMsgDiv()}>Cancel</button>
                    </div>
                        </div>
                    </div>}
                            <Link to={`/user/${message.sender.id}/`} className="Link">
                                <div className={message.sender.id === userData.id ? "profileDivMe": "profileDivUser"}>
                                    {message.sender?.name[0]}
                                </div>
                            </Link>
                            <h6 className="senderName">{shortenName(message.sender?.name)}</h6>
                            <p className="messageContent">{message?.content}</p>
                            <div className="messageDateAndTime">
                                <p>{reverseDate(message.date_time.slice(0,10))} at {message.date_time.slice(11, 16)}</p>
                            </div>
                        </li>
                    </>
                    ))}
                    {messageData.at(-1)?.sender.id === userData.id && messageSeen && <p className="seenIcon"><FontAwesomeIcon  icon={faEye} /> seen</p>}
                </ul> 
        </div>
    )
}