export default initBoard = () => {
    init(side: number): IBoard {
        const positions = calculatePositions(side);
        const rowWidth = calcRowWidth(side);
        return {
          side,
          rowWidth,
          positions,
          isDone: true,
        };
      }
}