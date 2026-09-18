import Phaser from "phaser";
import { useEffect, useRef } from "react";

type GameState = { selected: number; nails: string[]; shape: string; length: string; finish: string; decoration: string; hand: "left" | "right" };
type Props = GameState & { onSelect: (index: number) => void };

const FINGERS = [
  { x: 118, y: 310, width: 56, height: 178, angle: -18 },
  { x: 194, y: 218, width: 62, height: 254, angle: -7 },
  { x: 270, y: 184, width: 65, height: 282, angle: 0 },
  { x: 346, y: 222, width: 62, height: 250, angle: 7 },
  { x: 402, y: 383, width: 70, height: 174, angle: 42 },
] as const;

class ManicureScene extends Phaser.Scene {
  private manicure: GameState | null = null;
  private choose: (index: number) => void = () => undefined;
  private rendered = false;
  constructor() { super("studio-m-manicure"); }
  setManicure(state: GameState, choose: (index: number) => void) { this.manicure = state; this.choose = choose; if (this.rendered) this.paint(); }
  create() { this.rendered = true; if (this.manicure) this.paint(); }

  private paint() {
    this.children.removeAll(true);
    const state = this.manicure;
    if (!state) return;
    const bg = this.add.graphics();
    bg.fillStyle(0xfff8f4, 1).fillRect(0, 0, 520, 650);
    bg.fillStyle(0xf3d5cc, .53).fillCircle(80, 88, 160);
    bg.fillStyle(0xc7d0c1, .4).fillCircle(470, 545, 165);
    bg.lineStyle(1, 0xd9ae9e, .34).strokeRoundedRect(18, 18, 484, 614, 30);
    [[56, 82], [466, 103], [458, 547], [72, 555]].forEach(([x, y]) => this.sparkle(x, y, 0xc49683, .45));

    const hand = this.add.container(0, 0);
    if (state.hand === "right") { hand.setScale(-1, 1); hand.x = 520; }
    this.drawPalm(hand);
    const ordered = state.hand === "left" ? [4, 3, 2, 1, 0] : [5, 6, 7, 8, 9];
    FINGERS.forEach((finger, slot) => this.drawFinger(hand, finger, ordered[slot], state));
    this.add.text(260, 600, "KLEPNĚTE NA NEHET A VYTVOŘTE VLASTNÍ DESIGN", { fontFamily: "DM Sans, Arial", fontSize: "11px", color: "#7c5b50", letterSpacing: 1.2 }).setOrigin(.5).setAlpha(.86);
  }

  private drawPalm(parent: Phaser.GameObjects.Container) {
    const g = this.add.graphics();
    g.fillStyle(0xa45f52, .13).fillEllipse(274, 471, 302, 265);
    g.fillStyle(0xe1a281, 1).fillEllipse(268, 424, 274, 280);
    g.fillStyle(0xf2c4aa, .62).fillEllipse(252, 394, 236, 228);
    g.fillStyle(0xffdcc6, .34).fillEllipse(220, 365, 110, 145);
    g.fillStyle(0xc78369, .2).fillEllipse(334, 457, 115, 158);
    parent.add(g);
  }

  private drawFinger(parent: Phaser.GameObjects.Container, f: typeof FINGERS[number], index: number, state: GameState) {
    const finger = this.add.container(f.x, f.y).setRotation(Phaser.Math.DegToRad(f.angle));
    parent.add(finger);
    const skin = this.add.graphics();
    skin.fillStyle(0xb96f5d, .23).fillRoundedRect(-f.width / 2 + 4, -f.height / 2 + 7, f.width, f.height, f.width / 2);
    skin.fillStyle(0xe4a486, 1).fillRoundedRect(-f.width / 2, -f.height / 2, f.width, f.height, f.width / 2);
    skin.fillStyle(0xf6c8ad, .54).fillRoundedRect(-f.width / 2 + 7, -f.height / 2 + 8, f.width * .46, f.height - 18, f.width / 2);
    skin.lineStyle(1, 0x9c594c, .14).strokeRoundedRect(-f.width / 2, -f.height / 2, f.width, f.height, f.width / 2);
    finger.add(skin);

    const nail = this.add.container(0, -f.height / 2 + 27);
    finger.add(nail);
    const height = state.length === "Krátká" ? 39 : state.length === "Dlouhá" ? 70 : 54;
    const width = state.shape === "Stiletto" ? 25 : state.shape === "Square" ? 36 : state.shape === "Coffin" ? 32 : 31;
    const plate = this.add.graphics();
    const color = Phaser.Display.Color.HexStringToColor(state.nails[index]).color;
    plate.fillStyle(0x8a493c, .18).fillEllipse(2, 4, width + 5, height + 6);
    plate.fillStyle(color, 1);
    if (state.shape === "Stiletto") plate.fillTriangle(0, -height / 2 - 8, width / 2, height / 2, -width / 2, height / 2);
    else if (state.shape === "Coffin") plate.fillPoints([{ x: -width / 2 + 5, y: -height / 2 }, { x: width / 2 - 5, y: -height / 2 }, { x: width / 2, y: height / 2 }, { x: -width / 2, y: height / 2 }], true);
    else plate.fillRoundedRect(-width / 2, -height / 2, width, height, state.shape === "Square" ? 6 : width / 2);
    this.drawFinish(plate, state, width, height);
    if (index === state.selected) { plate.lineStyle(3, 0xffffff, .95).strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 12); plate.lineStyle(1, 0x795044, .65).strokeRoundedRect(-width / 2 - 7, -height / 2 - 7, width + 14, height + 14, 15); }
    nail.add(plate);
    this.drawDecoration(nail, state.decoration, height);
    const hit = this.add.zone(0, 0, width + 26, height + 28).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => { this.choose(index); this.tweens.add({ targets: nail, scale: { from: 1, to: 1.16 }, yoyo: true, duration: 130 }); });
    nail.add(hit);
  }

  private drawFinish(g: Phaser.GameObjects.Graphics, state: GameState, width: number, height: number) {
    if (state.finish === "Velvet mat") return;
    if (state.finish === "Ombré") g.fillStyle(0xffffff, .43).fillRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height * .42, width / 3);
    if (state.finish === "Chrom") g.fillStyle(0xffffff, .65).fillEllipse(-width * .14, -height * .1, 7, height * .68);
    else g.fillStyle(0xffffff, .34).fillEllipse(-width * .14, -height * .14, 5, height * .58);
    if (state.finish === "Glazed") g.fillStyle(0xffefe8, .34).fillCircle(width * .12, height * .05, width * .25);
    if (state.finish === "Třpyt") [[-7, -10], [6, 1], [-2, 14]].forEach(([x, y]) => g.fillStyle(0xffffff, .78).fillCircle(x, y, 1.8));
  }
  private drawDecoration(nail: Phaser.GameObjects.Container, decoration: string, height: number) {
    if (decoration === "Bez zdobení") return;
    const icons: Record<string, string> = { "Kamínky": "✦", "3D květy": "✿", "Mašličky": "⌘", "Hvězdičky": "✧", "Srdíčka": "♥", "Zlatá linka": "—" };
    nail.add(this.add.text(0, height * .08, icons[decoration] ?? "✦", { fontFamily: "Georgia, serif", fontSize: decoration === "Zlatá linka" ? "25px" : "18px", color: decoration === "Zlatá linka" ? "#f5d694" : "#fff8ef", stroke: "#78493e", strokeThickness: 1 }).setOrigin(.5));
  }
  private sparkle(x: number, y: number, color: number, alpha: number) { const g = this.add.graphics(); g.fillStyle(color, alpha).fillTriangle(x, y - 8, x + 2, y - 2, x + 8, y).fillTriangle(x, y + 8, x - 2, y + 2, x - 8, y); }
}

export default function NailGameCanvas(props: Props) {
  const mount = useRef<HTMLDivElement>(null); const gameRef = useRef<Phaser.Game | null>(null); const latest = useRef(props); latest.current = props;
  useEffect(() => {
    if (!mount.current) return;
    const game = new Phaser.Game({ type: Phaser.CANVAS, width: 520, height: 650, parent: mount.current, backgroundColor: "#fff8f4", scene: [] }); gameRef.current = game;
    const boot = () => { const scene = new ManicureScene(); game.scene.add("studio-m-manicure", scene, true); scene.setManicure(latest.current, latest.current.onSelect); };
    game.events.once(Phaser.Core.Events.READY, boot);
    return () => { game.events.off(Phaser.Core.Events.READY, boot); game.destroy(true); gameRef.current = null; };
  }, []);
  useEffect(() => { const scene = gameRef.current?.scene.getScene("studio-m-manicure") as ManicureScene | undefined; scene?.setManicure(props, props.onSelect); }, [props]);
  return <div ref={mount} className="nail-phaser" aria-label="Interaktivní náhled manikúry" />;
}
