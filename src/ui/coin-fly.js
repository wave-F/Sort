export function createCoinFly({ layerEl, frameEl, getTargetRect } = {}) {
  let playing = false;

  function createCoinParticle(startX, startY, size) {
    const coin = document.createElement("img");
    coin.className = "coin-fly-item";
    coin.src = "./assets/images/currency128_Coin.png";
    coin.style.width = `${size}px`;
    coin.style.height = `${size}px`;
    coin.style.opacity = "0";
    coin.style.transform = `translate(${startX - size * 0.5}px, ${startY - size * 0.5}px) scale(0.72)`;
    return coin;
  }

  function playCoinFly(reward, options = {}) {
    const totalReward = Math.max(1, Math.floor(reward));
    const count = Math.max(1, Math.min(14, totalReward));
    if (playing || !layerEl || !frameEl) return;
    const targetRect = getTargetRect?.();
    if (!targetRect) return;

    const origin = options.originRect || targetRect;
    const frameRect = frameEl.getBoundingClientRect();
    const fromX = origin.left - frameRect.left + origin.width * 0.5;
    const fromY = origin.top - frameRect.top + origin.height * 0.5;
    const toX = targetRect.left - frameRect.left + targetRect.width * 0.5;
    const toY = targetRect.top - frameRect.top + targetRect.height * 0.5;
    const size = Math.max(1, origin.width || 72);
    const half = size * 0.5;
    const dx = toX - fromX;
    const dy = toY - fromY;
    playing = true;
    layerEl.classList.remove("hidden");
    layerEl.replaceChildren();
    let finishedCount = 0;

    for (let i = 0; i < count; i += 1) {
      const coin = createCoinParticle(fromX, fromY, size);
      layerEl.appendChild(coin);

      const jitterX = (Math.random() - 0.5) * 148;
      const jitterY = (Math.random() - 0.5) * 92;
      const arcX = dx * (0.4 + Math.random() * 0.22) + (Math.random() - 0.5) * 42;
      const arcY = dy * 0.48 - (40 + Math.random() * 80);
      const sx = fromX + jitterX - half;
      const sy = fromY + jitterY - half;
      const mx = fromX + arcX - half;
      const my = fromY + arcY - half;
      const ex = toX - half;
      const ey = toY - half;
      const revealDelay = Math.floor(Math.random() * 280);

      const flyAnim = coin.animate(
        [
          { transform: `translate(${sx}px, ${sy}px) scale(0.72)`, opacity: 0 },
          { transform: `translate(${sx}px, ${sy}px) scale(1)`, opacity: 1, offset: 0.12 },
          { transform: `translate(${mx}px, ${my}px) scale(0.9)`, opacity: 1, offset: 0.62 },
          { transform: `translate(${ex}px, ${ey}px) scale(0.36)`, opacity: 0.15, offset: 1 },
        ],
        {
          duration: 780,
          delay: revealDelay + i * 42,
          easing: "cubic-bezier(0.2, 0.72, 0.28, 1)",
          fill: "forwards",
        }
      );

      const finalizeCoin = () => {
        if (!coin.isConnected) return;
        options.onCoinArrive?.(i, count);
        coin.remove();
        finishedCount += 1;
        if (finishedCount >= count) {
          layerEl.classList.add("hidden");
          layerEl.replaceChildren();
          playing = false;
          options.onDone?.();
        }
      };

      flyAnim.onfinish = finalizeCoin;
      flyAnim.oncancel = finalizeCoin;
    }
  }

  function isPlaying() {
    return playing;
  }

  return {
    playCoinFly,
    isPlaying,
  };
}
