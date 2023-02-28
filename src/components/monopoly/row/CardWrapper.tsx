import {
  buildOnSite,
  creditPlayerMoney,
  debitPlayerMoney,
  mortgageSite,
  redeemSite,
  sellBuild,
  setCurrentCard,
  setShowModal,
} from '@monopoly/lib//core';
import {
  ACTION_TYPES,
  isBuildable,
  ISite,
  isSellable,
  IState,
  MODAL_TYPES,
} from 'lib/core/src/lib';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Card from './Card/Card';

interface CardWrapperPropsType {
  site: ISite;
  rowNum: number;
  boughtBy: number;
}
const CardWrapper = (props: CardWrapperPropsType) => {
  const { site, rowNum, boughtBy } = props;

  const actionData = useSelector((store: IState) => store.actionData);
  const playersSites = useSelector(
    (store: IState) => store.siteData.playersSites
  );
  const activePlayer = useSelector(
    (store: IState) => store.playersData.activePlayer
  );
  const noOfCardsInCategory = useSelector(
    (store: IState) => store.siteData.noOfCardsInCategory
  );

  const dispatch = useDispatch();

  const [isActionable, setIsActionable] = useState(false);

  const getIsActionable = useCallback(() => {
    const card = playersSites[activePlayer].filter(
      (item) => item.id === site.id
    );

    switch (actionData.currentAction) {
      case null:
        return true;
      case ACTION_TYPES.MORTGAGE:
        return card.length ? !card[0].isMortgaged : false;
      case ACTION_TYPES.REDEEM:
        return card.length ? card[0].isMortgaged : false;
      case ACTION_TYPES.BUILD:
        return isBuildable(
          playersSites[activePlayer],
          site,
          noOfCardsInCategory
        );
      case ACTION_TYPES.SELL:
        return isSellable(
          playersSites[activePlayer],
          site,
          noOfCardsInCategory
        );
      default:
        return false;
    }
  }, [
    activePlayer,
    site,
    playersSites,
    actionData.currentAction,
    noOfCardsInCategory,
  ]);

  const onCardClick = () => {
    if (actionData.active && isActionable) {
      switch (actionData.currentAction) {
        case ACTION_TYPES.MORTGAGE:
          mortgageCard();
          break;
        case ACTION_TYPES.REDEEM:
          redeemCard();
          break;
        case ACTION_TYPES.BUILD:
          build();
          break;
        case ACTION_TYPES.SELL:
          sell();
          break;
        default:
          console.log('Invalid Action');
      }
    } else if (!actionData.active) {
      //
      showCardModal();
    }
  };

  const showCardModal = () => {
    dispatch(setShowModal(true, MODAL_TYPES.SHOW_CARD));
    dispatch(setCurrentCard(site));
  };

  const mortgageCard = () => {
    dispatch(mortgageSite(site.id, activePlayer));
    dispatch(creditPlayerMoney(activePlayer, (site.sellingPrice * 50) / 100));
  };

  const redeemCard = () => {
    dispatch(redeemSite(site.id, activePlayer));
    dispatch(debitPlayerMoney(activePlayer, (site.sellingPrice * 55) / 100));
  };

  const build = () => {
    dispatch(buildOnSite(site.id, activePlayer));
    dispatch(debitPlayerMoney(activePlayer, site.construction));
  };

  const sell = () => {
    dispatch(sellBuild(site.id, activePlayer));
    dispatch(creditPlayerMoney(activePlayer, site.construction / 2));
  };

  useEffect(() => {
    const _isActionable = getIsActionable();
    setIsActionable(_isActionable);
  }, [getIsActionable]);

  return (
    <Card
      onCardClick={onCardClick}
      site={site}
      rowNum={rowNum}
      active={isActionable}
      boughtBy={boughtBy}
    />
  );
};

export default CardWrapper;
