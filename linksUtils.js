const debugMode = false;

const Utils = {
    debugLog: errMessage => {
        if( debugMode ) {
          console.log(errMessage);
        }
      },

    isMobile: () => {
        try {
            const devicesMobile = ["iPhone", "Android", "webOS", "BlackBerry", "iPad", "iPod"];// check if is a mobile
            let isMobile = devicesMobile.some(dev => {
                if (navigator.userAgent.indexOf(dev) !== -1) {
                    return true;
                }
            });
            return isMobile;
        }
        catch (e) {
            Utils.debugLog(e);
        }
    },

    getLink: (cellphoneNumber, message = null) => {
        try {
            const universal_host = `https://wa.me/`;
            Utils.debugLog(`${universal_host}549${cellphoneNumber}${((message) ? (`?text=${message}`) : '')}`);
            return encodeURI(`${universal_host}549${cellphoneNumber}${((message) ? (`?text=${message}`) : '')}`);
        }
        catch (e) {
            Utils.debugLog(e);
        }
    },
    validateCellphoneNumber: (cellphoneNumber) => {
        try {
            return !((cellphoneNumber == "") || (cellphoneNumber.length < 8));
        }
        catch (e) {
            Utils.debugLog(e);
        }
    },
    formatCellphoneNumber: (cellphoneNumber) => {
        try {
            return cellphoneNumber.replace(/[^0-9]/g, "").replace(/^(54)9?/g, "");
        }
        catch (e) {
            Utils.debugLog(e);
        }
    },
    openChat: (url) => {
        try {
            window.open(url, '_blank');
        }
        catch (e) {
            Utils.debugLog(e);
        }
    }
}