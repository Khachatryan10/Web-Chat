import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { userDataI } from "../interfaces/interfaces";

const initialState = {
    id: "",
    name: "",
    lastName: "",
    email: "",
    birth_date: undefined,
    authenticated: false
}

export const userDataSlice = createSlice({
    name: "userData",
    initialState,
    reducers: {
        addUserData: (state: userDataI, action):void => {
            state.id = action.payload.id;
            state.name = action.payload.name;
            state.lastName = action.payload.lastName;
            state.email = action.payload.email;
            state.birth_date = action.payload.birth_date;
        },
        
        removeUserData: (state):void => {
            state = initialState
        },

        isAuthenticated: (state, action:PayloadAction<boolean>):void => {
            state.authenticated = action.payload
        }

    }
})

export const userDataSliceReducer = userDataSlice.reducer
export const { addUserData, removeUserData, isAuthenticated } = userDataSlice.actions