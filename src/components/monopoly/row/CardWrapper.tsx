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
  MODAL_TYPES,
} from 'lib/core/src/lib';
import { useCallback, useEffect, useState } from 'react';
import useAppDispatch from 'src/hooks/redux/use-app-dispatch';
import useAppSelector from 'src/hooks/redux/use-app-selector';
import Card from './Card/Card';

interface CardWrapperPropsType {
  site: ISite;
  rowNum: number;
  boughtBy: number;
}

const CardWrapper = (props: CardWrapperPropsType) => {
  const { site, rowNum, boughtBy } = props;

  const actionData = useAppSelector((store) => store.actionData);
  const playersSites = useAppSelector((store) => store.siteData.playersSites);
  const activePlayer = useAppSelector(
    (store) => store.playersData.activePlayer
  );
  const noOfCardsInCategory = useAppSelector(
    (store) => store.siteData.noOfCardsInCategory
  );

  const dispatch = useAppDispatch();

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
