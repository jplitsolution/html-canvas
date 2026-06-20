import { useState, useCallback } from 'react';
import ImageUploadModal from './ImageUploadModal';

export default function ImageContainer() {

const [type, setType] = useState(null);

const [url, setUrl] = useState('');

const [overlayOpacity, setOverlayOpacity] = useState(0.4);

const [text, setText] = useState('');

const [isModalOpen, setIsModalOpen] = useState(false);

const DEFAULT =
'https://images.unsplash.com/photo-1579546929518-9e396f3cc809';

const activeImage = url || DEFAULT;

const handleUploadSuccess = useCallback(
(imageUrl, placementType) => {

setUrl(imageUrl);

setType(placementType);

if (placementType === 'background') {
setText('Click to edit text');
setOverlayOpacity(0.4);
}

if (placementType === 'inline') {
setText('');
setOverlayOpacity(0);
}

setIsModalOpen(false);

},
[]
);

return (

<div className="max-w-6xl mx-auto p-8 space-y-6">

<button
onClick={() => setIsModalOpen(true)}
className="px-5 py-3 rounded-xl bg-indigo-600 text-white"
>
Upload Image
</button>

{type === 'background' && (
<div className="space-y-5">

<div>
<label>Overlay</label>

<input
type="range"
min={0}
max={1}
step={0.05}
value={overlayOpacity}
onChange={(e)=>
setOverlayOpacity(
Number(e.target.value)
)
}
/>

</div>

</div>
)}

<div className="rounded-3xl overflow-hidden">

{type === 'background' ? (

<div
className="relative min-h-[500px]"
style={{
backgroundImage:`url(${activeImage})`,
backgroundSize:'cover',
backgroundPosition:'center'
}}
>

<div
className="absolute inset-0 bg-black"
style={{
opacity:overlayOpacity
}}
/>

<div className="relative z-10 p-20">

<textarea
value={text}
onChange={(e)=>
setText(e.target.value)
}
placeholder="Write text..."
rows={3}
className="
w-full
bg-transparent
text-white
text-center
text-5xl
font-bold
outline-none
resize-none
"
/>

</div>

</div>

) : (

<div className="bg-slate-900 p-10">

<img
src={activeImage}
className="
w-full
rounded-xl
max-h-[500px]
object-cover
"
/>

</div>

)}

</div>

<ImageUploadModal
isOpen={isModalOpen}
onClose={() => setIsModalOpen(false)}
onUploadSuccess={handleUploadSuccess}
/>

</div>

);

}