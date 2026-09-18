import Phaser from "phaser";
import { useEffect, useRef } from "react";

type GameState = { selected: number; nails: string[]; shape: string; length: string; finish: string; decoration: string; hand: "left" | "right" };
type Props = GameState & { onSelect: (index: number) => void };
const POSITIONS = [[92,234, -15], [185,135,-8], [264,97,0], [341,140,8], [448,342,34]] as const;

class ManicureScene extends Phaser.Scene {
  private state: GameState | null = null; private onSelect: (index: number) => void = () => undefined; private ready = false;
  constructor() { super("manicure-preview"); }
  setManicure(state: GameState, onSelect: (index: number) => void) { this.state = state; this.onSelect = onSelect; if (this.ready) this.paint(); }
  preload() { this.load.image("hand", "/nehty/manicure-game-hand-v2.png"); }
  create() { this.ready = true; if (this.state) this.paint(); }
  private paint() {
    this.children.removeAll(true); if (!this.state) return;
    const image = this.add.image(256,384,"hand").setDisplaySize(512,768).setFlipX(this.state.hand === "right");
    const indices = this.state.hand === "left" ? [4,3,2,1,0] : [5,6,7,8,9];
    POSITIONS.forEach(([rawX,y,angle], slot) => {
      const index = indices[slot]; const x = this.state!.hand === "right" ? 512 - rawX : rawX;
      const rotation = Phaser.Math.DegToRad(this.state!.hand === "right" ? -angle : angle);
      const height = this.state!.length === "Krátká" ? 38 : this.state!.length === "Dlouhá" ? 63 : 51;
      const width = this.state!.shape === "Stiletto" ? 24 : this.state!.shape === "Square" ? 34 : 30;
      const holder = this.add.container(x,y).setRotation(rotation); const g = this.add.graphics();
      g.fillStyle(Phaser.Display.Color.HexStringToColor(this.state!.nails[index]).color,.95);
      if (this.state!.shape === "Stiletto") g.fillTriangle(0,-height/2,width/2,height/2,-width/2,height/2);
      else g.fillRoundedRect(-width/2,-height/2,width,height,this.state!.shape === "Square" ? 6 : width/2);
      if (this.state!.finish !== "Velvet mat") { g.fillStyle(0xffffff,this.state!.finish === "Chrom" ? .65 : .34); g.fillEllipse(-width*.13,-height*.12,5,height*.55); }
      if (this.state!.finish === "Ombré") { g.fillStyle(0xffffff,.45); g.fillRect(-width/2,-height/2,width,height*.3); }
      if (this.state!.finish === "Třpyt") { g.fillStyle(0xffffff,.75); [[-6,-9],[5,2],[-3,13]].forEach(([px,py]) => g.fillCircle(px,py,1.5)); }
      if (index === this.state!.selected) { g.lineStyle(2,0xffffff,1); g.strokeRoundedRect(-width/2-3,-height/2-3,width+6,height+6,9); }
      holder.add(g);
      if (this.state!.decoration !== "Bez zdobení") { const icon = this.state!.decoration === "Srdíčka" ? "♥" : this.state!.decoration === "3D květy" ? "✿" : "✦"; holder.add(this.add.text(0,1,icon,{fontFamily:"serif",fontSize:"17px",color:"#fff9ee",stroke:"#624237",strokeThickness:1}).setOrigin(.5)); }
      const hit = this.add.zone(0,0,width+22,height+18).setInteractive({useHandCursor:true}); hit.on("pointerdown",()=>this.onSelect(index)); holder.add(hit);
    });
    image.setDepth(-1);
  }
}

export default function NailGameCanvas(props: Props) {
  const mount = useRef<HTMLDivElement>(null); const gameRef = useRef<Phaser.Game | null>(null); const latest = useRef(props); latest.current = props;
  useEffect(() => { if (!mount.current) return; const game = new Phaser.Game({type:Phaser.CANVAS,width:512,height:768,parent:mount.current,scene:[]}); gameRef.current=game; const boot=()=>{const scene=new ManicureScene(); game.scene.add("manicure-preview",scene,true); scene.setManicure(latest.current,latest.current.onSelect);}; game.events.once(Phaser.Core.Events.READY,boot); return()=>{game.events.off(Phaser.Core.Events.READY,boot);game.destroy(true);}; },[]);
  useEffect(()=>{const scene=gameRef.current?.scene.getScene("manicure-preview") as ManicureScene|null|undefined;scene?.setManicure(props,props.onSelect);},[props]);
  return <div ref={mount} className="nail-phaser nail-phaser-portrait" aria-label="Interaktivní náhled manikúry" />;
}
