import React from 'react'
import style from '../../assets/css/row.module.css'

const Row = ({vertical, horizontal, left, right, top, bottom}) => {
    const genClassList =  () => {
        let classList = "";
        classList += horizontal? style.horizontal+" " : ""
        classList += vertical? style.vertical+" " : ""
        classList += left? style.left+" " : ""
        classList += right? style.right+" " : ""
        classList += top? style.top+" " : ""
        classList += bottom? style.bottom+" " : ""
        console.log(classList)
        return classList
    }
    return (
        <div className={`${style.row} ${genClassList()}`}>
            
        </div>
    );
}

export default Row;