const Utils = {

    isMobile: () => {
        try {
            const devicesMobile = ["iPhone", "Android", "webOS", "BlackBerry", "iPad", "iPod"];// check if is a mobile
            let isMobile = devicesMobile.some(dev => {
                console.log(`${navigator.userAgent} contains: ${dev} => ${navigator.userAgent.indexOf(dev)}`);
                if (navigator.userAgent.indexOf(dev) !== -1) {
                    return true;
                }
            });
            return isMobile;
        }
        catch (e) {
            registerException(e);
        }
    },

    getLink: (cellphoneNumber, message = null) => {
        try {
            const host_mobile = `whatsapp://`;
            const host_desktop = `https://web.whatsapp.com/`;
            console.log(`${((Utils.isMobile()) ? host_mobile : host_desktop)}send?phone=+549${cellphoneNumber}${((message) ? (`&text=${message}`) : '')}&app_absent=0`);
            return encodeURI(`${((Utils.isMobile()) ? host_mobile : host_desktop)}send?phone=+549${cellphoneNumber}${((message) ? (`&text=${message}`) : '')}&app_absent=0`);
        }
        catch (e) {
            registerException(e);
        }
    },
    validateCellphoneNumber: (cellphoneNumber) => {
        try {
            return !((cellphoneNumber == "") || (cellphoneNumber.length < 8));
        }
        catch (e) {
            registerException(e);
        }
    },
    formatCellphoneNumber: (cellphoneNumber) => {
        try {
            return cellphoneNumber.replace(/[^0-9]/g, "").replace(/^(54)9?/g, "");
        }
        catch (e) {
            registerException(e);
        }
    },
    openChat: (url) => {
        try {
            window.open(url, '_blank');
        }
        catch (e) {
            registerException(e);
        }
    }
}