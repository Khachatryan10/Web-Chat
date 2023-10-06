import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { isAuthenticated } from "../features/userDataSlice";
import { LoginDataI, InputErrorPrgI, CsrfTokenI } from "../interfaces/interfaces";
import { RootState } from "../app/store";

export default function LoginForm():JSX.Element {
    const [loginData, setLoginData] = useState<LoginDataI>({
        email: "",
        password: ""
    })

    const userData = useSelector((state:RootState) => state.userData)
    const dispatch = useDispatch()

    const [inputErrorPrg, setInputErrorPrg] = useState<InputErrorPrgI>({
        styles: {
            textAlign: "center",
            color: "#ff5252",
            fontSize: "16px",                        
            height: "18px"
        },

        content: ""
    })

    const [csrf_token, setCsrf_token] = useState<string>("")
    const navigate = useNavigate()
    const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = event.target
        setLoginData(prevState => {
            return {
                ...prevState,
                [name]: value
            }
        })
    }

    useEffect(() => {
        fetch("http://127.0.0.1:8000/get_csrf_token")
            .then(response => response.json())
            .then((data:CsrfTokenI) => {
                setCsrf_token(data.csrf_token)
            }
        )
    },[])

    const handleLogin = async (): Promise<void> => {
        await fetch("http://127.0.0.1:8000/login_user", {
                    method: "POST",
                    mode: "same-origin",
                    headers: {
                        'X-CSRFToken': csrf_token
                    },
                    body: JSON.stringify({
                        email: loginData.email,
                        password: loginData.password
                    })
                })
                .then(response => {
                    
                    if (!response.ok){
                        setInputErrorPrg(prevState => {
                            return {
                                ...prevState,
                                content: "Email and/or password is incorrect!"
                            }
                        })
                    }
                    else {
                        dispatch(isAuthenticated(true)) 

                        return navigate("/")
                        
                    }
                })
                .catch(error => console.log(error))
                
    }

    return(
        <div className="loginDiv">
            <input type="text" className="loginDiv__input" value={loginData.email} onChange={handleValueChange} name="email" placeholder="email" maxLength={80} />
            <input type="password" className="loginDiv__input" value={loginData.password} onChange={handleValueChange} name="password" placeholder="password" maxLength={80} />
            <br />
            <p style={inputErrorPrg.styles}>{inputErrorPrg.content}</p>
            <button className="loginDiv__loginBtn" onClick={handleLogin}>Log in</button>
        </div>
    )
}