import { Composition, registerRoot } from 'remotion'
import { LearningIsland } from './LearningIsland'
import { KnowledgeGate } from './KnowledgeGate'
export function RemotionRoot() {
  return <>
    <Composition id="LearningIsland" component={LearningIsland} width={760} height={600} fps={30} durationInFrames={240} defaultProps={{ growth: 1, celebrating: false }} />
    <Composition id="IslandCelebration" component={LearningIsland} width={760} height={600} fps={30} durationInFrames={180} defaultProps={{ growth: 3, celebrating: true }} />
    <Composition id="KnowledgeGate" component={KnowledgeGate} width={1440} height={1000} fps={30} durationInFrames={1800} defaultProps={{ progress: 0.5 }} />
  </>
}
registerRoot(RemotionRoot)