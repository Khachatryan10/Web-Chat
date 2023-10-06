import { configureStore } from '@reduxjs/toolkit';
import { userDataSliceReducer,  } from '../features/userDataSlice';
import { myNotificationsSliceReducer } from '../features/myNotificationsSlice';
import { chatUsersDataSliceReducer } from '../features/chatUsersDataSlice';

export const store = configureStore({
    reducer: {
        userData: userDataSliceReducer,
        notificationData: myNotificationsSliceReducer,
        chatUsersData: chatUsersDataSliceReducer
    },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
