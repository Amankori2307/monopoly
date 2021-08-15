import React from 'react'
import style from '../../assets/css/row.module.css'
import Card from './Card'
const Row = ({rowNum, data}) => {
    return (
        <div className={`${style.row} ${style["row"+rowNum]}`}>
            {data.map((data, index) => <Card key={index} data={data} rowNum={rowNum} />)}
        </div>
    );
}

export default Row;