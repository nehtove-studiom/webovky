import Phaser from "phaser";
import { useEffect, useRef } from "react";

type GameState = { selected: number; nails: string[]; shape: string; length: string; finish: string; decoration: string };
type Props = GameState & { onSelect: (index: number) => void };

const POSITIONS = [[351, 217, 43], [157, 342, -10], [232, 372, -8], [300, 382, -3], [358, 357, 10], [417, 217, -43], [611, 342, 10], [536, 372, 8], [468, 382, 3], [410, 357, -10]] as const;

class ManicureScene extends Phaser.Scene {
  private state: GameState | null = null;
  private ready = false;
  private selectFinger: (index: number) => void = () => undefined;
  constructor() { super("manicure-preview"); }
  setManicure(next: GameState, onSelect: (index: number) => void) { this.state = next; this.selectFinger = onSelect; if (this.ready) this.drawManicure(); }
  preload() { this.load.image("hands", "/nehty/interactive-hands-base-v1.png"); }
  create() {
    this.add.image(384, 256, "hands").setDisplaySize(768, 512);
    this.ready = true;
    if (this.state) this.drawManicure();
  }
  private drawManicure() {
    this.children.getAll().filter((child) => child.name === "polish").forEach((child) => child.destroy());
    if (!this.state) return;
    POSITIONS.forEach(([x, y, angle], index) => this.addNail(x, y, angle, index));
  }
  private addNail(x: number, y: number, angle: number, index: number) {
    if (!this.state) return;
    const long = this.state.length === "Krátká" ? 34 : this.state.length === "Dlouhá" ? 53 : 44;
    const wide = this.state.shape === "Square" ? 23 : this.state.shape === "Stiletto" ? 19 : 21;
    const group = this.add.container(x, y).setName("polish").setRotation(Phaser.Math.DegToRad(angle));
    const polish = this.add.graphics();
    const alpha = this.state.finish === "Velvet mat" ? .82 : .94;
    polish.fillStyle(Phaser.Display.Color.HexStringToColor(this.state.nails[index]).color, alpha);
    if (this.state.shape === "Stiletto") polish.fillTriangle(0, -long / 2, wide / 2, long / 2, -wide / 2, long / 2);
    else if (this.state.shape === "Coffin") polish.fillPoints([{ x: -wide * .34, y: -long / 2 }, { x: wide * .34, y: -long / 2 }, { x: wide / 2, y: long / 2 }, { x: -wide / 2, y: long / 2 }], true);
    else polish.fillRoundedRect(-wide / 2, -long / 2, wide, long, this.state.shape === "Square" ? 5 : wide / 2);
    if (this.state.finish !== "Velvet mat") {
      polish.fillStyle(0xffffff, this.state.finish === "Chrom" ? .68 : .35);
      polish.fillEllipse(-wide * .12, -long * .16, Math.max(3, wide * .18), long * .52);
    }
    if (this.state.finish === "Ombré") { polish.fillStyle(0xffffff, .52); polish.fillRect(-wide / 2, -long / 2, wide, long * .31); }
    if (this.state.finish === "Třpyt") { polish.fillStyle(0xffffff, .6); [[-4,-7],[4,3],[-2,10]].forEach(([px,py]) => polish.fillCircle(px,py,1.4)); }
    if (index === this.state.selected) { polish.lineStyle(2, 0xffffff, 1); polish.strokeRoundedRect(-wide / 2 - 3, -long / 2 - 3, wide + 6, long + 6, 8); }
    group.add(polish);
    if (this.state.decoration !== "Bez zdobení") {
      const symbol = this.state.decoration === "Srdíčka" ? "♥" : this.state.decoration === "Mašličky" ? "⌁" : this.state.decoration === "3D květy" ? "✿" : "✦";
      group.add(this.add.text(0, 2, symbol, { fontFamily: "serif", fontSize: "16px", color: "#fff8ee", stroke: "#63463d", strokeThickness: 1 }).setOrigin(.5));
    }
    const hit = this.add.zone(0, 0, wide + 16, long + 14).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => this.selectFinger(index));
    group.add(hit);
  }
}

export default function NailGameCanvas(props: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const propsRef = useRef(props); propsRef.current = props;
  useEffect(() => {
    if (!mountRef.current) return;
    const game = new Phaser.Game({ type: Phaser.CANVAS, width: 768, height: 512, parent: mountRef.current, backgroundColor: "#f5ddd8", scene: [], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
    gameRef.current = game;
    const startScene = () => {
      const scene = new ManicureScene();
      game.scene.add("manicure-preview", scene, true);
      scene.setManicure(propsRef.current, propsRef.current.onSelect);
    };
    game.events.once(Phaser.Core.Events.READY, startScene);
    return () => { game.events.off(Phaser.Core.Events.READY, startScene); game.destroy(true); gameRef.current = null; };
  }, []);
  useEffect(() => { const scene = gameRef.current?.scene.getScene("manicure-preview") as ManicureScene | null | undefined; scene?.setManicure(props, props.onSelect); }, [props]);
  return <div ref={mountRef} className="nail-phaser overflow-hidden rounded-[22px] border border-white/80 shadow-[0_18px_36px_-26px_rgba(76,45,37,.65)]" aria-label="Interaktivní náhled manikúry" />;
}
