import React from 'react'
import style from '../../../../../assets/css/trade-card-modal.module.css'

 const AmountInput = ({labelText, amount, type, setAmount}) => {
    const setAmountHelper = (e) => {
        console.log(amount)
        let val = parseInt(e.target.value)
        val = val?val:0;
        console.log(val, type)
        setAmount(type, val)
    }
    return (
        <div className={style.col}>
            <div className={style.inputContainer}>
                <label className={style.label}>{labelText}: 
                    <span>$
                        <input 
                            className={style.amount} 
                            type="number" 
                            value={amount} 
                            onChange={setAmountHelper}
                            />
                        </span>
                </label>
            </div>
        </div>
    )
}

export default AmountInput