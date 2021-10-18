import React from 'react'
import style from '../../../../assets/css/trade-card-modal.module.css'
import CardListItem from './CardListItem'
const CardList = ({cardList, listName}) => {
    return (
        <div className={style.cardList}>
            {cardList.map(cardData => <CardListItem key={cardData.site.id} cardData={cardData} listName={listName}/>)}  
            
        </div>
    ) 
}

export default CardList