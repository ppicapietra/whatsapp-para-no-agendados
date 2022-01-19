describe("open chat with international format number", function () {
    it("visit site and open chat", function () {
        cy.visit('https://wanoa.test/');
        cy.get("#cellphone").type("+5493413443428");
        cy.get("#send").click();
        
    });
});