// Interactive Video Elements Scaffold
export type InteractiveElement = {
  type: 'hotspot' | 'form' | 'poll' | 'branch';
  position: { x: number; y: number };
  data: any;
};

export function addInteractiveElement(videoId: string, element: InteractiveElement): boolean {
  // Placeholder: Add element to video
  return true;
}
