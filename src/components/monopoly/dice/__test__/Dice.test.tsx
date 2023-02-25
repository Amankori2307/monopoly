import { render } from "../../../../utility/test/testUtils"
import Dice from "../Dice"


describe("Dice.js Test Suite", () => {
    test("check if dice renders with correct text", () => {
        const component = render(<Dice number={1}/>)
        const text = component.getByText("1")
        expect(text.textContent).toBe("1")
    })
})
