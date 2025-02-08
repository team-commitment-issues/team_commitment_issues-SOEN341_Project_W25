import e from 'express';
import { Document, Schema, model } from 'mongoose';

interface IChannel extends Document {
    name: string;
    createdBy: Schema.Types.ObjectId;
}

const ChannelSchema = new Schema<IChannel>({
    name: {
        type: String,
        required: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
});

const Channel = model<IChannel>('Channel', ChannelSchema);

export default Channel;