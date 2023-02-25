import {render, screen, fireEvent} from '../../../../utility/test/testUtils'
import DiceContainer from '../DiceContainer'

describe("DiceContainer", () => {
    
    beforeEach(() => {
        render(<DiceContainer />)
    })
    
    it("Should render both the dices", () => {
       expect(screen.getAllByText("6").length).toBe(2)
    })

 
})