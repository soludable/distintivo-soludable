import { BPS, DIM_NAMES, DIM_DESC } from '../data/bps.js';
import { isActive } from '../lib/evaluacion.js';
import BpCard from './BpCard.jsx';
import BrandFooter from './BrandFooter.jsx';

export default function DimView({ dim, evalData }) {
  const { state, obs, files, tipo, locked, toggleBp, setObservacion, addFile, removeFile } = evalData;
  const bps = BPS.filter((bp) => bp.dim === dim);

  return (
    <div className="view active cl-view">
      <div className="dim-hdr">
        <div className="dim-title">{DIM_NAMES[dim]}</div>
        <div className="dim-sub">{DIM_DESC[dim]}</div>
      </div>
      {bps.map((bp) => (
        <BpCard
          key={bp.id}
          bp={bp}
          checked={!!state[bp.id]}
          obsValue={obs[bp.id]}
          files={files[bp.id]}
          hidden={!isActive(bp, tipo)}
          locked={locked}
          onToggle={toggleBp}
          onObs={setObservacion}
          onAddFile={addFile}
          onRemoveFile={removeFile}
        />
      ))}
      <BrandFooter />
    </div>
  );
}
