describe("open chat with international format number", function () {
    it("visit site and open chat", function () {
        cy.visit('https://wanoa.test/');
        cy.get("#cellphone").type("+5493413443428");
        cy.get("#send").click();
        // cy.location().should((loc) => {
        //     expect(loc.host).to.eq("api.whatsapp.com");
        // });
        cy.window().then((win) => {
            cy.get("#main span").should((e) => {
                expect(e).to.have("attr.title").eq("+5493413443428")
            });
        })



        // cy.location().should((loc) => {
        //     expect(loc.host).to.eq("web.whatsapp.com")
        // });
        // cy.contains("#main span").should((e) => {
        //     expect(e.title).to.eq("+549153443428")
        // });
    });
});