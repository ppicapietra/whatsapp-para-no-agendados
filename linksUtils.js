const Utils = {

    getLink: (cellphoneNumber, message = null) => {
        try {
            return encodeURI(`https://web.whatsapp.com/send?phone=+549${cellphoneNumber}${((message) ? (`&text=${message}`) : '')}&app_absent=0`);
        }
        catch (e) { }
    },
 validateCellphoneNumber: (cellphoneNumber) => {
        try {
            return !((cellphoneNumber == "") || (cellphoneNumber.length < 8));
        }
        catch (e) { }
    },
formatCellphoneNumber: (cellphoneNumber) => {
        try {
            return cellphoneNumber.replace(/[^0-9]/g, "").replace(/^(54)9?/g, "");
        }
        catch (e) { }
    },
openChat: (url) => {
        try {
            window.open(url,'_blank');
        }
        catch (e) { }
    }
}