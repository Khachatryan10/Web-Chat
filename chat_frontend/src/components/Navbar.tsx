import { useSelector } from "react-redux";
import { Link, NavigateFunction, useNavigate } from "react-router-dom";
import { RootState } from "../app/store";
import { useDispatch } from "react-redux";
import { isAuthenticated } from "../features/userDataSlice";
import { Dispatch, useEffect, useState, useRef} from "react";
import { addUserData } from "../features/userDataSlice"
import { AnyAction } from "@reduxjs/toolkit";
import { SearchedUserDataI, UserDataFetchI } from "../interfaces/interfaces";
import { shortenName } from "../extraFunctions/functions";
import { faMagnifyingGlass, faCircleXmark} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function Navbar(): JSX.Element {
    const userData = useSelector((state:RootState) => state.userData)
    const [searchInputValue, setSearchInputValue] = useState<string>("")
    const [searchedUsersData, setSearchedUsersData] = useState<SearchedUserDataI[]>([])
    const [displayLogoutDiv, setDisplayLogoutDiv] = useState<boolean>(false)
    const [displaySearchInput, setDisplaySearchInput] = useState<boolean>(false)
    const [pageSize, setPageSize] = useState<number>(5)
    const dispatch:Dispatch<AnyAction> = useDispatch()
    const navigate:NavigateFunction = useNavigate()
    const refSearchDiv = useRef<HTMLDivElement>(null)

    const toggleDisplayLogoutDiv = ():void => {
        setDisplayLogoutDiv(true)
    }

    const handleLogout = async():Promise<void> => {
        await fetch("http://127.0.0.1:8000/logout_user")
        dispatch(isAuthenticated(false))
        setDisplayLogoutDiv(false)
        return navigate("/login")
    }
    
    useEffect(() => {
        setSearchInputValue("")
    },[userData.authenticated])

    useEffect(() => {
        fetch("http://127.0.0.1:8000/current_user_info")
            .then(response => response.json())
            .then((data) => {
                data.map((user: UserDataFetchI) => {
                    if (user.id && user.name && user.last_name && user.email){
                        dispatch(addUserData({
                            "id": user.id,
                            "name": user.name,
                            "lastName": user.last_name,
                            "email": user.email,
                            "birth_date": user.birth_date,
                        }))

                        dispatch(isAuthenticated(true))
                    }
                })
            }
        )    
    },[dispatch, userData.authenticated]) 

    const handleSearchDivScroll = ():void => {
        if (refSearchDiv.current){
            if (Math.floor(refSearchDiv.current.scrollTop) + 5 > refSearchDiv.current.scrollHeight - refSearchDiv.current.clientHeight){
                setPageSize(prevState => prevState + 5)
            }
        }
    }

    const fetchUsers = ():void => {
            fetch(`http://127.0.0.1:8000/users/${searchInputValue}/${pageSize}`)
            .then(response => response.json())
            .then(users => setSearchedUsersData(users))
            .catch(err => console.log(err)) 
            
    }

    useEffect(() => {
        if (searchInputValue){
            fetchUsers()
        }
    },[pageSize])

    useEffect(() => {
        setSearchedUsersData([])
        setPageSize(5)

        if (searchInputValue) {
            fetchUsers()
        }

    },[searchInputValue])

    useEffect(() => {
        setSearchInputValue("")
    },[displaySearchInput])

    return(
        <>
        {displayLogoutDiv && 
                    <div className="coverPageFormDiv">
                        <div className="coverPageFormDiv__container">
                        <h5>Do you want to log out</h5>
                    <div className="coverPageFormDiv__btnsContainer">
                        <button className="coverPageFormDiv__deleteBtn" onClick={handleLogout}>Log out</button>
                        <button className="coverPageFormDiv__cancelBtn" onClick={() => setDisplayLogoutDiv(false)}>Cancel</button>
                    </div>
            </div>
        </div>
        }
            <nav className="navbar">
                <ul className="navbarContainerUl">
                    <li>
                        {userData.authenticated && <FontAwesomeIcon icon={faMagnifyingGlass} className="searchIcon" onClick={() => setDisplaySearchInput(true)}/>}
                    </li>
                    {userData.authenticated && <Link to={`/user/${userData.id}/`}><li>{shortenName(userData.name)}</li></Link>}
                    {userData.authenticated && <Link to={`chat/${userData.id}/`}><li>Chat</li></Link>}
                    {!userData.authenticated && <Link to="/login"><li>Log in</li></Link>}
                    {!userData.authenticated && <Link to="/register"><li>Register</li></Link>}
                    {userData.authenticated && <li onClick={toggleDisplayLogoutDiv}>logout</li>}
                </ul>
            </nav>

            
            {userData.authenticated && displaySearchInput && 
            <div className="coverPageFormDiv">
                <input type="search" value={searchInputValue} autoFocus onChange={(e) => setSearchInputValue(e.target.value)} className="searchUserInput" placeholder="Search users"/>
                <div className={searchedUsersData.length ? "userSearchResultContainer": ""} ref={refSearchDiv} onScroll={handleSearchDivScroll}>
                    <ul className="usersUl">
                        {searchedUsersData.map((user: SearchedUserDataI) => (
                            <Link to={`/user/${user.id}/`} className="Link" onClick={() => setDisplaySearchInput(false)}>
                            <li className="userLi" key={user.id}>
                                <div className="userDiv">
                                    <div className="profileDivSearch">
                                        {user.name[0].toUpperCase()}
                                    </div>
                                    <p className="nameLastName">{shortenName(`${user.name} ${user.last_name}`)}</p>
                                </div>
                            </li>
                        </Link>
                        ))}
                    </ul>
                </div>
                    <FontAwesomeIcon icon={faCircleXmark} className="closeSearchBarIcon" onClick={() => setDisplaySearchInput(false)} />
            </div>
            }
        </>
    )
}