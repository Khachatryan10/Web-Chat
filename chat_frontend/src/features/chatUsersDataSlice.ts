import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ChatUsersDataI, UserToChatI } from "../interfaces/interfaces";

const initialState: ChatUsersDataI = {
    chatUsersData: [],
}

interface UpdateI {
    id: string;
    data: UserToChatI;
}

export const chatUsersDataSlice = createSlice({
    name: "chatUsersData",
    initialState,
    reducers: {
        addChatUsersData: (state, action:PayloadAction<UserToChatI>):void => {
            if (state.chatUsersData.every(data => data.id !== action.payload.id)){
                state.chatUsersData.push(action.payload)
            }
        },

        updateChatUsersData: (state, action:PayloadAction<UpdateI>):void => {
            state.chatUsersData = state.chatUsersData.filter(user => user.id !== action.payload.id)
            state.chatUsersData.unshift(action.payload.data)
        },

        removeUsersByRoomId: (state, action:PayloadAction<string>):void => {
            state.chatUsersData = state.chatUsersData.filter(users => users.room_id !== action.payload)
        },

        removeUsersByUserId: (state, action:PayloadAction<string>):void => {
            state.chatUsersData = state.chatUsersData.filter(users => users.id !== action.payload)
        },

        removeAllChatUsers: (state):void => {
            state.chatUsersData = []
        },

    }
})

export const chatUsersDataSliceReducer = chatUsersDataSlice.reducer
export const { addChatUsersData, removeUsersByRoomId, removeUsersByUserId, removeAllChatUsers, updateChatUsersData } = chatUsersDataSlice.actions