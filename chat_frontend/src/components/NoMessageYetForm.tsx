import { NoMessaheYetPropsI } from "../interfaces/interfaces"

export default function NoMessageYetForm(props:NoMessaheYetPropsI): JSX.Element {
    return(
            <h5 className="noMessageYetH5">{!props.amIInCurrentChat ? "This chat doesn't exist or is not In your chat list": "No Messages Yet"}</h5>
    )
}