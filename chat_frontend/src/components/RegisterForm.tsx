import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../app/store";
import { RegisterDataI, InputErrorPrgI, CsrfTokenI } from "../interfaces/interfaces";

export default function RegisterForm(): JSX.Element {
    const [registerData, setRegisterData] = useState<RegisterDataI>({
            name: "",
            lastName: "",
            email: "",
            birthDate: undefined,
            password: "",
            confirmation: ""
    })

    const [inputErrorPrg, setInputErrorPrg] = useState<InputErrorPrgI>({
        styles: {
            textAlign: "center",
            color: "#ff5252",
            fontSize: "17px",
        },

        content: ""
    })
    const {name, lastName, email, birthDate, password, confirmation} = registerData
    const authenticated:boolean = useSelector((state:RootState) => state.userData.authenticated)

    const [csrf_token, setCsrf_token] = useState<string>("")

    const passwordLength = password.length
    const containsNumber = /\d/.test(password)
    const containsCapitalLetter = /[A-Z]/.test(password)
    const containsSmallLetter = /[a-z]/.test(password)
    const containsSpecificCharacter = /[/,?(){}_[\]#\-*+<>|;:!'".\\$~@`]/.test(password)
    const matchesAll = passwordLength > 7 && containsNumber && containsCapitalLetter && containsSmallLetter && containsSpecificCharacter;
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)
    const nameRegex = /^[a-zA-Z]+$/.test(name)
    const lastNameRegex = /^[a-zA-Z]+$/.test(lastName)

    const handleInputValueChange = (event: React.ChangeEvent<HTMLInputElement>):void => {
        const {name, value} = event.target
        setRegisterData(prevState => {
            return {
                ...prevState,
                [name]: value 
            }
        })
    }

    const navigate = useNavigate()

    useEffect(() => {
        fetch("http://127.0.0.1:8000/get_csrf_token")
            .then(response => response.json())
            .then((data:CsrfTokenI) => {
                setCsrf_token(data.csrf_token)
            }
        )
    },[authenticated])

    useEffect(() => {
        if (email && !emailRegex){
            setInputErrorPrg(prevState => {
                return{
                    ...prevState,
                    content: "Invalid email address"
                }
            })
        }

        else if (name && !nameRegex || lastName && !lastNameRegex){
            setInputErrorPrg(prevState => {
                return{
                    ...prevState,
                    content: "Name and Last name sould contain only letters"
                }
            })
        }

        else if (password && !matchesAll){
            setInputErrorPrg(prevState => {
                return{
                    ...prevState,
                    content: "Password should contiain capital and small letter, number, and Non-Alphanumeric characters and should be longer than 7 characters"
                }
            })
        }

        else if (password && confirmation && password !== confirmation){
            setInputErrorPrg(prevState => {
                return{
                    ...prevState,
                    content: "Password and confirmation don't match"
                }
            })
        }

        else {
            setInputErrorPrg(prevState => {
                return {
                    ...prevState,
                    styles: {
                        textAlign: "center",
                        color: "#ff5252",
                        fontSize: "16px",
                        height: "18px"
                    },
                    content: ""
                }
            })
        }
    },[email, password, passwordLength, name, lastName])
    

    const postData = async (): Promise<void> => {
        if (name && lastName && email && birthDate && password && confirmation && matchesAll && emailRegex){
            await fetch("http://127.0.0.1:8000/register_user", {
                    method: "POST",
                    mode: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        'X-CSRFToken': csrf_token
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        lastName: lastName.trim(),
                        email: email,
                        birthDate: birthDate,
                        password: password,
                        confirmation: confirmation    
                    })
                })

                .then(response => {

                if (response.status === 400){
                    setInputErrorPrg(prevState => {
                        return{
                            ...prevState,
                            content: "Registration failed, make sure you provided all inputs with correct format "
                        }
                    })
                }
                
                if (response.status === 409){
                    setInputErrorPrg(prevState => {
                        return{
                            ...prevState,
                            content: "This Email is already in use!"
                        }
                    })
                }

                if (response.status === 404){
                    setInputErrorPrg(prevState => {
                        return{
                            ...prevState,
                            content: "Invalid birth date"
                        }
                    })
                }

                if (!response.ok && response.status !== 400 && response.status !== 409 && response.status !== 404){
                    setInputErrorPrg(prevState => {
                        return{
                            ...prevState,
                            content: "Something went wrong"
                        }
                    })
                }

                if (response.ok){
                    return navigate("/login")
                }

            })
            .catch(error => console.log(error))
        }
        else {
            setInputErrorPrg(prevState => {
                return{
                    ...prevState,
                    content: "Please fill all the fields"
                    }
            })
        }
    }

    return(
        <div className="registerDiv">
            <input type="text" value={name} onChange={handleInputValueChange} className="registerDiv__input" name="name" placeholder="name" maxLength={64} />
            <input type="text" value={lastName} onChange={handleInputValueChange} className="registerDiv__input" name="lastName" placeholder="last name" maxLength={64} />
            <input type="text" value={email} onChange={handleInputValueChange} className="registerDiv__input" name="email" placeholder="email" maxLength={80} />
            <input type="date" value={birthDate} onChange={handleInputValueChange} className="registerDiv__input" placeholder="Birth day" name="birthDate" />
            <input type="password" value={password} onChange={handleInputValueChange} className="registerDiv__input" placeholder="password" name="password" />
            <input type="password" value={confirmation} onChange={handleInputValueChange} className="registerDiv__input" placeholder="confirmation" name="confirmation" />
            <br />
            <p style={inputErrorPrg.styles}>{inputErrorPrg.content}</p>
            <button className="registerDiv__registerBtn" onClick={postData}>Register</button>
        </div>
    )
}