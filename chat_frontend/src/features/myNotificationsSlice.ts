import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { MyNotifsI, NotificationI } from "../interfaces/interfaces";

const initialState: MyNotifsI = {
    myNotif: [],
    notificationUpdate: false
}

export const myNotificationsSlice = createSlice({
    name: "notificationData",
    initialState,
    reducers: {
        addNotifications: (state, action:PayloadAction<NotificationI>):void => {
            if (!state.myNotif.some(notif => notif.id === action.payload.id)){
                state.myNotif.push(action.payload)
            }
        },
        
        removeNotification: (state, action:PayloadAction<string>):void => {
            state.myNotif = state.myNotif.filter(notif => notif.sent_by !== action.payload)
        },

        updateNotification: (state):void => {
            state.notificationUpdate = !state.notificationUpdate
        },

        removeAllNotifications: (state) => {
            state.myNotif = initialState.myNotif
        }

    }
})


export const myNotificationsSliceReducer = myNotificationsSlice.reducer
export const { addNotifications, updateNotification, removeNotification, removeAllNotifications } = myNotificationsSlice.actions