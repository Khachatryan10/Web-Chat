export const reverseDate = (birthDate: string):string => {
        let date = `${birthDate.slice(8,10)}/${birthDate.slice(5,7)}/${birthDate.slice(0,4)}`
        return date
    }

export const shortenName = (name:string): string => {
    if (name.length <= 10) return name
    return `${name.slice(0,10)}... `
}
