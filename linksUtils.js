const Utils = {

    getLink: (cellphoneNumber, message = null) => {
        try {
            return encodeURI(`https://wa.me/+549${cellphoneNumber}${((message) ? (`&text=${message}`) : '')}`);
        }
        catch (e) { }
    },
 validateCellphoneNumber: (cellphoneNumber) => {
        try {
            return !((cellphoneNumber == "") || (cellphoneNumber.length < 9));
        }
        catch (e) { }
    },
formatCellphoneNumber: (cellphoneNumber) => {
        try {
            return cellphoneNumber.replace(/[^0-9]/g, "").replace(/^(54)?9?/g, "");
        }
        catch (e) { }
    },
openChat: (url) => {
        try {
            window.location = url;
        }
        catch (e) { }
    }
}