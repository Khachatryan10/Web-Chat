import { useSelector } from "react-redux"
import { RootState } from "../app/store"
import { isAuthenticated, removeUserData, } from "../features/userDataSlice"
import React, { useEffect, useState } from "react"
import { ChangePasswordStateI, CsrfTokenI, NotificationFormI, UserToChatI,userDataI } from "../interfaces/interfaces"
import { useParams } from "react-router-dom"
import { reverseDate } from "../extraFunctions/functions"
import { useDispatch } from "react-redux"
import { useNavigate, Link } from "react-router-dom"

export default function UserProfileForm(props: NotificationFormI): JSX.Element {
    const [changePasswordState, setChangePasswordState] = useState<ChangePasswordStateI>({
        oldPassword: "",
        newPassword: "",
        confirmation: "",
        textAlign: "center",
        color: "",
        fontSize: "16px",
        height: "18px",
        content: "",
        changed: false
    })

    const { wsNotif } = props
    const [displayRemoveChatDiv, setDisplayRemoveChatDiv] = useState<boolean>(false)
    const [displayDeleteProfileDiv, setDisplayDeleteProfileDiv] = useState<boolean>(false)
    const [csrf_token, setCsrf_token] = useState<string>("")
    const {oldPassword, newPassword, confirmation, changed} = changePasswordState
    const passwordLength = newPassword.length
    const containsNumber = /\d/.test(newPassword)
    const containsCapitalLetter = /[A-Z]/.test(newPassword)
    const containsSmallLetter = /[a-z]/.test(newPassword)
    const containsSpecificCharacter = /[/,?(){}_[\]#\-*+<>|;:!'".\\$~@`]/.test(newPassword)
    const matchesAll = passwordLength > 7 && containsNumber && containsCapitalLetter && containsSmallLetter && containsSpecificCharacter;
    const authenticated:boolean = useSelector((state:RootState) => state.userData.authenticated)
    const params = useParams()
    const currentUserData:userDataI = useSelector((state:RootState) => state.userData)
    const [userData, setUserData] = useState<UserToChatI>()
    const [passwordInput, setPasswordInput] = useState<string>("")
    const [errorPrg, setErrorPrg] = useState<string>("")
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const usersDataChat:UserToChatI[] = useSelector((state:RootState) => state.chatUsersData.chatUsersData)
    
    
    const roomId =  usersDataChat.filter(user => user?.id === params?.user_id)[0]?.room_id
    

    useEffect(() => {
        if (params.user_id){
                fetch(`http://127.0.0.1:8000/get_user/${params.user_id}`) 
                .then(response => response.json())
                .then((data:UserToChatI[]) => {
                    setUserData(data[0])
                })
    }
    },[params.user_id])

    useEffect(() => {
        fetch("http://127.0.0.1:8000/get_csrf_token")
            .then(response => response.json())
            .then((data:CsrfTokenI) => {
                setCsrf_token(data.csrf_token)
            }
        )
    },[authenticated])   

    const handleInputValueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const {name, value} = e.target

        setChangePasswordState(prevState => {
            return{
                    ...prevState,
                    [name]: value,
                    changed: false
                }
        })
    }

    useEffect(() => {
        if (newPassword && !matchesAll){
            setChangePasswordState(prevState => {
            return{
                ...prevState,
                    color: "#ff5252",
                    content: "Password should contain capital and small letter, number, and Non-Alphanumeric characters and should be longer than 7 characters",
                    changed: false
                }
            
        })
    }

        else if (newPassword && confirmation && newPassword !== confirmation){
            setChangePasswordState(prevState => {
                return{
                    ...prevState,
                        color: "#ff5252",
                        content: "Password and confirmation don't match",
                        changed: false
                }
        })
        }

        else {
            if (!changed){
                setChangePasswordState(prevState => {
                    return{
                        ...prevState,
                        content: ""
                    }
                
            })
        }
        }
    },[newPassword, confirmation, changed])

    const handleChangePassword = async (): Promise<void> => {
        if (matchesAll && newPassword === confirmation){
            await fetch("http://127.0.0.1:8000/change_password", {
                    method: "POST",
                    mode: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        'X-CSRFToken': csrf_token
                    },
                    body: JSON.stringify({
                        oldPassword: oldPassword,
                        newPassword: newPassword,
                        confirmation: confirmation
                    })
                })
                .then(response => {
                    
                    if (response.ok){
                        setChangePasswordState(prevState => {
                        return{
                            ...prevState,
                                oldPassword: "",
                                newPassword: "",
                                confirmation: "",   
                                color: "rgb(1, 177, 101)",
                                content: "Password is successfully changed",
                                changed: true     
                        }
                    })

                    }
                    else {
                        setChangePasswordState(prevState => {
                            return{
                                ...prevState,
                                    color: "#ff5252",
                                    content: response.status === 400 ? "Please fill password with appropriate format": 
                                    response.status === 409 ? "New password can't be the same as the old one": 
                                    response.status === 422 ? "Password and confirmation mismatch": 
                                    response.status === 401 ? "Old password is wrong" :
                                    response.status === 404 ? "Missing input" : "Something went wrong"
                                    
                            }
                        })
                    }

                })
            .catch(error => console.log(error))
        }
        else {
            setChangePasswordState(prevState => {
                return{
                    ...prevState,
                        color: "#ff5252",
                        content: "Missing input"
                }
            })
        }
    }

    const handleRemoveFromChat = ():void => {
        if (wsNotif.current?.readyState === wsNotif.current?.OPEN && params.user_id){
            wsNotif.current?.send(JSON.stringify({
                "type": "remove_from_chat",
                "senderId": currentUserData.id,
                "memberId": params.user_id
            }))

        setDisplayRemoveChatDiv(false)
    }
}

    const handleDeleteProfile = async():Promise<void> => {
        if (!passwordInput) return;

        await fetch("http://127.0.0.1:8000/delete_profile", {
                    method: "DELETE",
                    mode: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        'X-CSRFToken': csrf_token
                    },
                    body: JSON.stringify({
                        password: passwordInput,
                    })
                })
                .then(response => {
                    if (response.ok){
                        dispatch(removeUserData())
                        dispatch(isAuthenticated(false))
                        return navigate("/login")
                    }

                    else if (response.status === 401){
                        setErrorPrg("Wrong Password")
                    }

                    else {
                        setErrorPrg("Something went Wrong")
                    }

                })
    }
    const isChatMember:boolean = usersDataChat.some(user => user.id === params.user_id) || params.user_id === currentUserData.id

    return(
        <div className="profile">
            <div className="userNameFirstLetterDiv">
                {userData?.name[0].toUpperCase()}
            </div>

            <div className="userInfoDiv">
                <h5>{userData?.name} {userData?.last_name}</h5>
                <hr />
                {isChatMember && 
                    <>
                        <h5>{userData?.email}</h5>
                        <hr /> 
                        <h5>{reverseDate(userData?.birth_date ? userData.birth_date.toString(): "")}</h5>
                        <hr /> 
                    </>
                }
                
            
            </div>
                {displayRemoveChatDiv && <div className="coverPageFormDiv">
                        <div className="coverPageFormDiv__container">
                            <h5>Do you want to delete chat with {userData?.name}</h5>
                    <div className="coverPageFormDiv__btnsContainer">
                        <button className="coverPageFormDiv__deleteBtn" onClick={handleRemoveFromChat}>Delete</button>
                        <button className="coverPageFormDiv__cancelBtn" onClick={() => setDisplayRemoveChatDiv(false)}>Cancel</button>
                    </div>
                        </div>
                    </div>}

                {displayDeleteProfileDiv && <div className="coverPageFormDiv">
                        <div className="coverPageFormDiv__container">
                            <h5>Confirm Profile Deletion</h5> 
                        <div className="deleteProfileContainer">
                            <input type="password" value={passwordInput} placeholder="password" onChange={(e) => setPasswordInput(e.target.value)} />
                            <p>{errorPrg}</p>
                        </div>
                    <div className="coverPageFormDiv__btnsContainer">
                        <button className="coverPageFormDiv__deleteBtn" onClick={handleDeleteProfile}>Delete</button>
                        <button className="coverPageFormDiv__cancelBtn" onClick={() => setDisplayDeleteProfileDiv(false)}>Cancel</button>
                    </div>
                        </div>
                    </div>}
                {isChatMember && params.user_id !== currentUserData?.id && 
                <>
                    <div className="deleteChatDiv">
                        <button onClick={() => setDisplayRemoveChatDiv(true)}>Delete Chat</button>
                    </div>
                    {roomId &&<div className="goToChatDiv">
                        <Link className="Link" to={`/chat/${roomId}`}><button>Chat</button></Link>
                    </div>}
                </>
                }
        {params.user_id === currentUserData?.id && <div className="changePasswordDiv">
            <h3>Change Password</h3>
            <input type="password" placeholder="old password" value={oldPassword} onChange={handleInputValueChange} name="oldPassword"/>
            <input type="password" placeholder="new password" value={newPassword} onChange={handleInputValueChange} name="newPassword"/>
            <input type="password" placeholder="confirmation" value={confirmation} onChange={handleInputValueChange} name="confirmation"/>
            <p style={{textAlign: "center", color: changePasswordState.color, fontSize: changePasswordState.fontSize, height: changePasswordState.height}}>{changePasswordState.content}</p>
            <br />
            <button onClick={handleChangePassword}>Save</button>
        </div>
        }

        {params.user_id === currentUserData?.id && 
        <div className="deleteProfileDiv">
            <button onClick={() => setDisplayDeleteProfileDiv(true)}>Delete Profile</button>
        </div>}
        </div>
    )
}